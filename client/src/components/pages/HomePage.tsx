import { useNavigate } from "react-router-dom";
import "../../styles/home-page.css";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <main className="home-page">
      <div className="home-page__overlay">
        <h1 className="home-page__title">Генеалогическое древо</h1>
        <p className="home-page__subtitle">
          Удобный и красивый инструмент визуализации родственных связей
        </p>
        <button className="home-page__button" onClick={() => navigate("/tree")}>Начать</button>
      </div>
    </main>
  );
}
