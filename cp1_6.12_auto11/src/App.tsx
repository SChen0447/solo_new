import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Designer } from "@/components/Designer";
import { Viewer } from "@/components/Viewer";
import { Statistics } from "@/components/Statistics";
import SurveyList from "@/pages/SurveyList";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SurveyList />} />
        <Route path="/designer/:surveyId" element={<Designer />} />
        <Route path="/viewer/:surveyId" element={<Viewer />} />
        <Route path="/dashboard/:surveyId" element={<Statistics />} />
      </Routes>
    </Router>
  );
}
