import { useNavigate } from "react-router-dom";
import { useFamilyLog } from "../../hooks/useFamilyLog";
import "../../styles/home-page.css";

export default function HomePage() {
    const navigate = useNavigate();
    const { resetLog } = useFamilyLog();

    const handleStart = async () => {
        localStorage.removeItem("saved_tree");
        localStorage.removeItem("current_user");
        localStorage.removeItem("family_log"); // если ты всё ещё используешь localStorage для клиентских логов
        await resetLog(); // очищаем серверные логи
        navigate("/tree");
    };

    return (
        <main className="home-page">
            <div className="home-page__overlay">
                <h1 className="home-page__title">Генеалогическое древо</h1>
                <p className="home-page__subtitle">
                    Удобный и красивый инструмент визуализации родственных связей
                </p>
                <button className="home-page__button" onClick={handleStart}>
                    Начать
                </button>
            </div>
        </main>
    );
}
