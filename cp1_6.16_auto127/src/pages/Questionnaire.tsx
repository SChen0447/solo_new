import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import type { QuestionnaireData } from "../../shared/types.js";

type PetType = "cat" | "dog";
type ExerciseFreq = "low" | "medium" | "high";
type PetExp = "none" | "some" | "experienced";

const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
`;

export default function Questionnaire() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [petType, setPetType] = useState<PetType | null>(null);

  const [livingSpace, setLivingSpace] = useState<number>(20);
  const [awayHours, setAwayHours] = useState<number>(0);
  const [hasOtherPets, setHasOtherPets] = useState<boolean | null>(null);
  const [exerciseFrequency, setExerciseFrequency] = useState<ExerciseFreq | null>(null);
  const [dailySchedule, setDailySchedule] = useState<number>(6);
  const [petExperience, setPetExperience] = useState<PetExp | null>(null);

  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const handlePetSelect = (type: PetType) => {
    setPetType(type);
    setStep(2);
  };

  const validate = (): boolean => {
    const newErrors = new Set<string>();
    if (!petType) newErrors.add("petType");
    if (hasOtherPets === null) newErrors.add("hasOtherPets");
    if (!exerciseFrequency) newErrors.add("exerciseFrequency");
    if (!petExperience) newErrors.add("petExperience");
    setErrors(newErrors);
    return newErrors.size === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const data: QuestionnaireData = {
      petType: petType!,
      livingSpace,
      awayHours,
      hasOtherPets: hasOtherPets!,
      exerciseFrequency: exerciseFrequency!,
      dailySchedule,
      petExperience: petExperience!,
    };

    setSubmitting(true);
    try {
      const res = await axios.post("/api/questionnaire", data);
      const petId = res.data?.id ?? res.data?.petId;
      navigate(`/simulate?petId=${petId}`);
    } catch {
      setSubmitting(false);
    }
  };

  const radioGroup = <T extends string>(
    name: string,
    options: { label: string; value: T }[],
    value: T | null,
    onChange: (v: T) => void
  ) => (
    <div className="flex gap-3">
      {options.map((opt) => {
        const hasError = errors.has(name);
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setErrors((prev) => {
                const next = new Set(prev);
                next.delete(name);
                return next;
              });
            }}
            style={{
              border: hasError && !selected
                ? "2px solid #E53935"
                : selected
                  ? "2px solid #1976D2"
                  : "2px solid #E0E0E0",
              animation: hasError && !selected ? "shake 0.3s ease-in-out" : "none",
              borderRadius: 8,
              padding: "8px 20px",
              background: selected ? "#E3F2FD" : "#fff",
              color: selected ? "#1976D2" : "#616161",
              fontWeight: selected ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const sliderField = (
    name: string,
    label: string,
    min: number,
    max: number,
    value: number,
    onChange: (v: number) => void,
    unit: string
  ) => (
    <div style={{ marginBottom: 24 }}>
      <div className="flex justify-between items-center mb-2">
        <span style={{ fontWeight: 600, color: "#424242", fontSize: 15 }}>{label}</span>
        <span style={{ fontWeight: 700, color: "#1976D2", fontSize: 15 }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          onChange(Number(e.target.value));
          setErrors((prev) => {
            const next = new Set(prev);
            next.delete(name);
            return next;
          });
        }}
        className="w-full"
        style={{
          accentColor: "#1976D2",
          height: 6,
          cursor: "pointer",
        }}
      />
      <div className="flex justify-between" style={{ fontSize: 12, color: "#9E9E9E" }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <>
      <style>{shakeKeyframes}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F5F5",
          padding: "40px 16px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: "100%", maxWidth: 560 }}>
          <h1
            style={{
              textAlign: "center",
              fontSize: 28,
              fontWeight: 700,
              color: "#212121",
              marginBottom: 8,
            }}
          >
            🐾 虚拟宠物试用
          </h1>
          <p
            style={{
              textAlign: "center",
              color: "#757575",
              fontSize: 15,
              marginBottom: 32,
            }}
          >
            {step === 1 ? "选择你想要的宠物类型" : "告诉我们更多关于你的生活"}
          </p>

          {step === 1 && (
            <div className="flex justify-center gap-6">
              {(["cat", "dog"] as PetType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handlePetSelect(type)}
                  style={{
                    width: 200,
                    height: 240,
                    borderRadius: 8,
                    border: petType === type ? "3px solid #1976D2" : "2px solid #E0E0E0",
                    background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    transform: petType === type ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <span style={{ fontSize: 72 }}>{type === "cat" ? "🐱" : "🐶"}</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#424242" }}>
                    {type === "cat" ? "猫咪" : "狗狗"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  padding: "28px 24px",
                  marginBottom: 24,
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <span style={{ fontSize: 36 }}>{petType === "cat" ? "🐱" : "🐶"}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#1976D2" }}>
                    {petType === "cat" ? "猫咪" : "狗狗"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      marginLeft: "auto",
                      fontSize: 13,
                      color: "#1976D2",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    重新选择
                  </button>
                </div>

                {sliderField("livingSpace", "居住空间大小", 20, 200, livingSpace, setLivingSpace, " ㎡")}

                {sliderField("awayHours", "平均离家时长", 0, 12, awayHours, setAwayHours, " 小时")}

                <div
                  style={{
                    marginBottom: 24,
                    animation: errors.has("hasOtherPets") ? "shake 0.3s ease-in-out" : "none",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#424242", fontSize: 15, display: "block", marginBottom: 8 }}>
                    是否有其他宠物
                  </span>
                  {radioGroup(
                    "hasOtherPets",
                    [
                      { label: "是", value: true as unknown as string },
                      { label: "否", value: false as unknown as string },
                    ],
                    hasOtherPets as unknown as string | null,
                    (v) => setHasOtherPets(v === "true")
                  )}
                </div>

                <div
                  style={{
                    marginBottom: 24,
                    animation: errors.has("exerciseFrequency") ? "shake 0.3s ease-in-out" : "none",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#424242", fontSize: 15, display: "block", marginBottom: 8 }}>
                    运动频率
                  </span>
                  {radioGroup(
                    "exerciseFrequency",
                    [
                      { label: "低", value: "low" },
                      { label: "中", value: "medium" },
                      { label: "高", value: "high" },
                    ],
                    exerciseFrequency,
                    setExerciseFrequency
                  )}
                </div>

                {sliderField("dailySchedule", "作息时间（起床时间）", 6, 24, dailySchedule, setDailySchedule, " 点")}

                <div
                  style={{
                    marginBottom: 0,
                    animation: errors.has("petExperience") ? "shake 0.3s ease-in-out" : "none",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#424242", fontSize: 15, display: "block", marginBottom: 8 }}>
                    养宠经验
                  </span>
                  {radioGroup(
                    "petExperience",
                    [
                      { label: "无", value: "none" },
                      { label: "一些", value: "some" },
                      { label: "丰富", value: "experienced" },
                    ],
                    petExperience,
                    setPetExperience
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  background: "#1976D2",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 8,
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(25,118,210,0.3)",
                  opacity: submitting ? 0.7 : 1,
                  transition: "transform 0.2s, opacity 0.2s",
                  transform: "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
                onMouseDown={(e) => {
                  if (!submitting) e.currentTarget.style.transform = "scale(0.98)";
                }}
                onMouseUp={(e) => {
                  if (!submitting) e.currentTarget.style.transform = "scale(1.05)";
                }}
              >
                {submitting ? "提交中..." : "提交问卷"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
