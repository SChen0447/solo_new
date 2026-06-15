from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
import io
import zipfile
from image_processor import apply_watermark, generate_preview

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WatermarkConfig(BaseModel):
    type: str = "text"
    text: Optional[str] = "Watermark"
    font_size: Optional[int] = 36
    font_color: Optional[str] = "#ffffff"
    opacity: float = 0.7
    position: str = "bottom-right"
    scale: Optional[float] = 0.2


class ProcessRequest(BaseModel):
    image_ids: List[str]
    config: WatermarkConfig
    watermark_image_id: Optional[str] = None


class ImageData:
    def __init__(self, filename: str, data: bytes):
        self.filename = filename
        self.data = data
        self.preview_data: Optional[bytes] = None


class JobStatus:
    def __init__(self, total: int):
        self.total = total
        self.completed = 0
        self.failed = 0
        self.status: Dict[str, str] = {}
        self.results: Dict[str, bytes] = {}
        self.errors: Dict[str, str] = {}


images_store: Dict[str, ImageData] = {}
jobs_store: Dict[str, JobStatus] = {}


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Only JPG and PNG files are allowed")
    
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")
    
    image_id = str(uuid.uuid4())
    images_store[image_id] = ImageData(file.filename, content)
    
    return JSONResponse({
        "id": image_id,
        "filename": file.filename,
        "size": len(content)
    })


@app.post("/api/preview")
async def get_preview(
    image_id: str,
    config: WatermarkConfig,
    watermark_image_id: Optional[str] = None
):
    if image_id not in images_store:
        raise HTTPException(status_code=404, detail="Image not found")
    
    wm_data = None
    if watermark_image_id and watermark_image_id in images_store:
        wm_data = images_store[watermark_image_id].data
    
    try:
        preview_data = generate_preview(
            images_store[image_id].data,
            config.dict(),
            wm_data
        )
        return StreamingResponse(io.BytesIO(preview_data), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


def process_images_background(
    job_id: str,
    image_ids: List[str],
    config: WatermarkConfig,
    watermark_image_data: Optional[bytes]
):
    job = jobs_store.get(job_id)
    if not job:
        return
    
    for img_id in image_ids:
        job.status[img_id] = "processing"
        
        if img_id not in images_store:
            job.status[img_id] = "failed"
            job.errors[img_id] = "Image not found"
            job.failed += 1
            continue
        
        try:
            result = apply_watermark(
                images_store[img_id].data,
                config.dict(),
                watermark_image_data
            )
            job.results[img_id] = result
            job.status[img_id] = "completed"
            job.completed += 1
        except Exception as e:
            job.status[img_id] = "failed"
            job.errors[img_id] = str(e)
            job.failed += 1


@app.post("/api/process")
async def process_images(
    request: ProcessRequest,
    background_tasks: BackgroundTasks
):
    for img_id in request.image_ids:
        if img_id not in images_store:
            raise HTTPException(status_code=404, detail=f"Image {img_id} not found")
    
    job_id = str(uuid.uuid4())
    job = JobStatus(len(request.image_ids))
    
    for img_id in request.image_ids:
        job.status[img_id] = "pending"
    
    jobs_store[job_id] = job
    
    wm_data = None
    if request.watermark_image_id and request.watermark_image_id in images_store:
        wm_data = images_store[request.watermark_image_id].data
    
    background_tasks.add_task(
        process_images_background,
        job_id,
        request.image_ids,
        request.config,
        wm_data
    )
    
    return JSONResponse({"job_id": job_id, "total": len(request.image_ids)})


@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    job = jobs_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JSONResponse({
        "job_id": job_id,
        "total": job.total,
        "completed": job.completed,
        "failed": job.failed,
        "progress": (job.completed + job.failed) / job.total * 100,
        "statuses": job.status,
        "errors": job.errors,
        "is_complete": (job.completed + job.failed) >= job.total
    })


@app.get("/api/download/{job_id}")
async def download_results(job_id: str):
    job = jobs_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if (job.completed + job.failed) < job.total:
        raise HTTPException(status_code=400, detail="Processing not complete")
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for img_id, result_data in job.results.items():
            if img_id in images_store:
                original_name = images_store[img_id].filename
                name, ext = original_name.rsplit('.', 1)
                output_name = f"{name}_watermarked.{ext}"
                zipf.writestr(output_name, result_data)
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=watermarked_images_{job_id[:8]}.zip"
        }
    )


@app.delete("/api/images/{image_id}")
async def delete_image(image_id: str):
    if image_id in images_store:
        del images_store[image_id]
        return JSONResponse({"status": "success", "message": "Image deleted"})
    raise HTTPException(status_code=404, detail="Image not found")
