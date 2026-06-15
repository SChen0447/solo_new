import type { 
  Product, 
  Customization, 
  SceneConfig, 
  LeatherOption, 
  StitchOption, 
  HardwareOption,
  PreviewImage
} from './types'
import { SceneRenderer } from './SceneRenderer'
import { CAMERA_ANGLES, ANGLE_LABELS } from './types'

export class CustomizationEngine {
  private renderer: SceneRenderer | null = null
  private currentProduct: Product | null = null
  private currentCustomization: Customization | null = null
  private container: HTMLElement | null = null

  constructor() {}

  public init(container: HTMLElement): void {
    if (this.renderer) {
      this.renderer.dispose()
    }
    this.container = container
    this.renderer = new SceneRenderer(container)
  }

  public loadProduct(product: Product): void {
    if (!this.renderer) {
      throw new Error('CustomizationEngine not initialized. Call init() first.')
    }

    this.currentProduct = product
    this.currentCustomization = { ...product.defaultCustomization }

    const sceneConfig = this.buildSceneConfig()
    this.renderer.renderScene(sceneConfig)
  }

  public updateLeather(leather: LeatherOption): void {
    if (!this.currentCustomization || !this.renderer) return

    const startTime = performance.now()
    this.currentCustomization = {
      ...this.currentCustomization,
      leather
    }

    this.renderer.updateCustomization(this.currentCustomization, 600)
    const elapsed = performance.now() - startTime
    console.log(`[CustomizationEngine] Leather updated in ${elapsed.toFixed(2)}ms`)
  }

  public updateStitch(stitch: StitchOption): void {
    if (!this.currentCustomization || !this.renderer) return

    const startTime = performance.now()
    this.currentCustomization = {
      ...this.currentCustomization,
      stitch
    }

    this.renderer.updateCustomization(this.currentCustomization, 600)
    const elapsed = performance.now() - startTime
    console.log(`[CustomizationEngine] Stitch updated in ${elapsed.toFixed(2)}ms`)
  }

  public updateHardware(hardware: HardwareOption): void {
    if (!this.currentCustomization || !this.renderer) return

    const startTime = performance.now()
    this.currentCustomization = {
      ...this.currentCustomization,
      hardware
    }

    this.renderer.updateCustomization(this.currentCustomization, 600)
    const elapsed = performance.now() - startTime
    console.log(`[CustomizationEngine] Hardware updated in ${elapsed.toFixed(2)}ms`)
  }

  public setCustomization(customization: Customization): void {
    if (!this.renderer) return

    const startTime = performance.now()
    this.currentCustomization = customization
    this.renderer.updateCustomization(customization, 600)
    const elapsed = performance.now() - startTime
    console.log(`[CustomizationEngine] Full customization updated in ${elapsed.toFixed(2)}ms`)
  }

  public setCameraAngle(angleKey: string): Promise<void> {
    if (!this.renderer) return Promise.resolve()

    const position = CAMERA_ANGLES[angleKey]
    if (!position) return Promise.resolve()

    return new Promise((resolve) => {
      this.renderer!.setCameraPosition(position, true)
      setTimeout(resolve, 850)
    })
  }

  public async captureAnglePreview(angleKey: string): Promise<PreviewImage | null> {
    if (!this.renderer) return null

    const startTime = performance.now()
    await this.setCameraAngle(angleKey)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const dataUrl = this.renderer.captureScreenshot()
    const label = ANGLE_LABELS[angleKey] || angleKey
    
    const elapsed = performance.now() - startTime
    console.log(`[CustomizationEngine] Preview captured (${label}) in ${elapsed.toFixed(2)}ms`)

    return {
      angle: angleKey,
      dataUrl
    }
  }

  public async captureAllPreviews(): Promise<PreviewImage[]> {
    const angles = Object.keys(CAMERA_ANGLES)
    const previews: PreviewImage[] = []

    for (const angle of angles) {
      const preview = await this.captureAnglePreview(angle)
      if (preview) {
        previews.push(preview)
      }
    }

    return previews
  }

  public getCurrentCustomization(): Customization | null {
    return this.currentCustomization 
      ? { ...this.currentCustomization } 
      : null
  }

  public getCurrentProduct(): Product | null {
    return this.currentProduct 
      ? { ...this.currentProduct } 
      : null
  }

  private buildSceneConfig(): SceneConfig {
    if (!this.currentProduct || !this.currentCustomization) {
      throw new Error('Product not loaded')
    }

    return {
      productId: this.currentProduct.id,
      modelConfig: this.currentProduct.modelConfig,
      customization: this.currentCustomization,
      cameraPosition: [3.5, 2, 3.5],
      autoRotate: true,
      rotateSpeed: 0.3
    }
  }

  public reset(): void {
    if (!this.currentProduct) return

    this.currentCustomization = { ...this.currentProduct.defaultCustomization }
    
    if (this.renderer) {
      this.renderer.updateCustomization(this.currentCustomization, 400)
      this.renderer.setCameraPosition([3.5, 2, 3.5], true)
    }
  }

  public dispose(): void {
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.currentProduct = null
    this.currentCustomization = null
    this.container = null
  }
}
