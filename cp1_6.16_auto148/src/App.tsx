import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PortfolioGrid from "@/components/PortfolioGrid";
import ArtworkDetail from "@/components/ArtworkDetail";
import { useAppStore } from "@/store/useAppStore";

function HomePage() {
  const selectedArtworkId = useAppStore(state => state.selectedArtworkId);

  return (
    <>
      <PortfolioGrid />
      {selectedArtworkId && <ArtworkDetail />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
