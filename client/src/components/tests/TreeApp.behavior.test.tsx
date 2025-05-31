// src/components/tests/TreeApp.behavior.test.tsx

import React from "react";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from "@testing-library/react";
import {MemoryRouter, useNavigate} from "react-router-dom";
import TreeApp from "../TreeApp";
import { addLogEntry } from "../../services/logService";

// 1) Мокаем FamilyTreeGraph, чтобы обойти cytoscape + canvas
jest.mock("../FamilyTreeGraph", () => {
    return (props: any) => (
        <div data-testid="mock-graph">
            {/*
        Выводим «текстовую» версию:
        – список persons (в виде JSON-строки)
        – статус флагов showLabels/showBirthDates
      */}
            MockedFamilyTreeGraph:
            persons={JSON.stringify(props.treeData.persons)},
            labels={props.showLabels ? "on" : "off"},
            dates={props.showBirthDates ? "on" : "off"}
        </div>
    );
});

// 2) Мокаем сервис логов, чтобы отследить вызовы
jest.mock("../../services/logService", () => ({
    addLogEntry: jest.fn(),
}));

// 3) Мокаем useNavigate, чтобы можно было проверить переход
jest.mock("react-router-dom", () => {
    const original = jest.requireActual("react-router-dom");
    return {
        ...original,
        useNavigate: jest.fn(),
    };
});

describe("TreeApp: поведение при рендере, импорт/экспорт, toggle-sidebar", () => {
    // 0) Поллифицируем TextEncoder/TextDecoder, alert и URL.createObjectURL
    beforeAll(() => {
        // Поллифиллим TextEncoder/TextDecoder (jsdom)
        (globalThis as any).TextEncoder = require("util").TextEncoder;
        (globalThis as any).TextDecoder = require("util").TextDecoder;

        // Мокаем alert, чтобы не падало «Not implemented: window.alert»
        window.alert = jest.fn();

        // Мокаем URL.createObjectURL / revokeObjectURL
        (globalThis as any).URL.createObjectURL = jest.fn(() => "blob:dummy-url");
        (globalThis as any).URL.revokeObjectURL = jest.fn();

        HTMLAnchorElement.prototype.click = jest.fn();
    });

    // 4) Перед каждым тестом очищаем localStorage и мокаем fetch
    beforeEach(() => {
        // Очищаем localStorage (начинаем «новый» проект)
        localStorage.clear();

        // Мокаем fetch. Все запросы к "/api/tree" возвращают {persons:[],relations:[]}
        // Остальные – пустой JSON.
        (global as any).fetch = jest.fn((input: any) => {
            const url = input.toString();
            if (url.includes("/api/tree")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ persons: [], relations: [] }),
                });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
            });
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("первый рендер: отображается модалка и сайдбар с заголовком «Семейное древо»", () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Модалка: заголовок формы «Введите имя и идентификатор проекта»
        expect(
            screen.getByText(/введите имя и идентификатор проекта/i)
        ).toBeInTheDocument();

        // Сайдбар: даже если модалка открыта, сам сайдбар рендерится (заголовок «Семейное древо»)
        expect(screen.getByText(/семейное древо/i)).toBeInTheDocument();
    });

    test("после ввода имени и projectId и клика «Начать» появляется MockedFamilyTreeGraph", async () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Заполняем поля модалки
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "UserX" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "projX" },
        });

        // Жмём «Начать»
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));

        // Должны дождаться, что наш «MockedFamilyTreeGraph» появится
        await waitFor(() => {
            expect(screen.getByTestId("mock-graph")).toBeInTheDocument();
        });

        // Проверяем, что текст внутри содержит «persons=[]» (именно начальное пустое дерево)
        expect(screen.getByTestId("mock-graph").textContent).toContain(
            "persons=[]"
        );
    });

    test("импорт: при загрузке валидного JSON-графа обновляется список persons", async () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Шаг 1: нажмём «Начать», чтобы прошли эффекты fetch
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "UserImp" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "projImport" },
        });
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));

        await waitFor(() => {
            expect(screen.getByTestId("mock-graph")).toBeInTheDocument();
        });

        // Шаг 2: Мокаем FileReader для «импорта»
        const fileContent = JSON.stringify({
            persons: [{ id: "1", name: "Alice" }],
            relations: [],
        });

        // Создаём «фальшивый» файл с этим содержимым и mime-type application/json
        const file = new File([fileContent], "tree.json", {
            type: "application/json",
        });

        // Обходной путь: мокаем глобальный FileReader
        const originalFileReader = (globalThis as any).FileReader;
        class MockFileReader {
            public result: string | null = null;
            public onload: ((ev: ProgressEvent<FileReader>) => any) | null = null;
            readAsText(_file: File) {
                // Устанавливаем результат и вызываем onload
                this.result = fileContent;
                if (this.onload) {
                    // @ts-ignore: строим fake event
                    this.onload({ target: { result: fileContent } });
                }
            }
        }
        (globalThis as any).FileReader = MockFileReader;

        // Шаг 3: находим <input type="file"> и «загружаем» файл
        // Раньше мы искали через querySelector, теперь используем getByLabelText напрямую
        const importInput = screen.getByLabelText(/импорт/i) as HTMLInputElement;

        // Симулируем выбор файла:
        await act(async () => {
            fireEvent.change(importInput, {
                target: { files: [file] },
            });
        });

        // Ожидаем, что mock-graph обновится (в props передастся persons=[{id:"1",...}])
        await waitFor(() => {
            const txt = screen.getByTestId("mock-graph").textContent || "";
            expect(txt).toContain('"id":"1"');
        });

        // Проверяем, что addLogEntry вызвался с «UserImp импортировал дерево»
        expect(addLogEntry).toHaveBeenCalledWith("UserImp импортировал дерево");

        // Восстанавливаем реальный FileReader
        (globalThis as any).FileReader = originalFileReader;
    });

    test("импорт: при некорректном JSON вызывает alert", async () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Открываем приложение с projectId, чтобы не падали fetch
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "UserErr" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "projErr" },
        });
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));

        await waitFor(() => {
            expect(screen.getByTestId("mock-graph")).toBeInTheDocument();
        });

        // Мокаем FileReader, который выдаёт НЕвалидный JSON
        const badContent = "{ not valid json }";
        const fileBad = new File([badContent], "bad.json", {
            type: "application/json",
        });

        const originalFR = (globalThis as any).FileReader;
        class ErrFileReader {
            public result: any = null;
            public onload: ((ev: ProgressEvent<FileReader>) => any) | null = null;
            readAsText(_file: File) {
                this.result = badContent;
                if (this.onload) {
                    // @ts-ignore
                    this.onload({ target: { result: badContent } });
                }
            }
        }
        (globalThis as any).FileReader = ErrFileReader;

        // Симулируем загрузку «битого» файла
        const importInput = screen.getByLabelText(/импорт/i) as HTMLInputElement;

        await act(async () => {
            fireEvent.change(importInput, {
                target: { files: [fileBad] },
            });
        });

        // Ожидаем, что window.alert был вызван:
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Ошибка при импорте файла.");
        });

        (globalThis as any).FileReader = originalFR;
    });

    test("При удалении графа confirm и последующее обнуление treeData", async () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Вводим и ждём граф
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "Deleter" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "projDelete" },
        });
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));
        await waitFor(() => {
            expect(screen.getByText(/Семейное древо/i)).toBeInTheDocument();
        });

        // Имитируем, что пришло обновлённое treeData через событие
        act(() => {
            window.dispatchEvent(
                new CustomEvent("tree:update", {
                    detail: { persons: [{ id: "2", name: "B" }], relations: [] },
                })
            );
        });
        await waitFor(() => {
            const graph = screen.getByTestId("mock-graph");
            expect(graph.textContent).toContain('"id":"2"');
        });

        // Сначала «Отмена» confirm
        (window.confirm as any) = jest.fn().mockReturnValue(false);
        fireEvent.click(screen.getByRole("button", { name: /удалить граф/i }));
        // Данные не должны обнулиться
        expect(screen.getByTestId("mock-graph").textContent).toContain('"id":"2"');
        expect(addLogEntry).not.toHaveBeenCalledWith(
            "Deleter удалил всё семейное дерево"
        );

        // Теперь «ОК» confirm
        (window.confirm as any) = jest.fn().mockReturnValue(true);
        fireEvent.click(screen.getByRole("button", { name: /удалить граф/i }));

        // Ждём, пока graph отобразит пустой массив persons=[]
        await waitFor(() => {
            const graph = screen.getByTestId("mock-graph");
            expect(graph.textContent).toContain("persons=[]");
        });

        expect(addLogEntry).toHaveBeenCalledWith(
            "Deleter удалил всё семейное дерево"
        );
        // saved_tree должен быть удалён (если он когда-либо создавался)
        expect(localStorage.getItem("saved_tree")).toBeNull();
    });

    test("Кнопка «История изменений» вызывает navigate('/tree/log')", async () => {
        // Подменяем useNavigate на мок-функцию
        const mockedNavigate = jest.fn();
        const { useNavigate } = require("react-router-dom");
        (useNavigate as jest.Mock).mockReturnValue(mockedNavigate);

        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Вводим и ждём граф
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "UserZ" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "projZ" },
        });
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));
        await waitFor(() => {
            expect(screen.getByText(/Семейное древо/i)).toBeInTheDocument();
        });

        // Кликаем «История изменений»
        fireEvent.click(screen.getByRole("button", {
            name: /история изменений/i,
        }));

        expect(mockedNavigate).toHaveBeenCalledWith("/tree/log");
    });

    test("Тумблеры «Отобразить названия связей» и «даты рождения» сохраняются в localStorage", async () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Вводим данные и нажимаем Начать
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "UserX" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "pX" },
        });
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));

        // Ждём граф
        await waitFor(() => {
            expect(screen.getByText(/Семейное древо/i)).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole("checkbox");
        // По умолчанию оба чекбокса отмечены
        expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
        expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);

        // Снимаем первый чекбокс
        fireEvent.click(checkboxes[0]);
        expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
        await waitFor(() => {
            expect(localStorage.getItem("show_labels")).toBe("false");
        });

        // Снимаем второй чекбокс
        fireEvent.click(checkboxes[1]);
        expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
        await waitFor(() => {
            expect(localStorage.getItem("show_birth_dates")).toBe("false");
        });
    });

    test("экспорт: создаётся Blob, вызывается createObjectURL и addLogEntry", async () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Открываем проект, заполняем форму:
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "UserExp" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "projExport" },
        });
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));

        await waitFor(() => {
            expect(screen.getByTestId("mock-graph")).toBeInTheDocument();
        });

        // Сбросим мок fetch, чтобы при POST (сохранении) не падало
        (global as any).fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
        });

        // Теперь клик по «Экспорт»
        fireEvent.click(screen.getByRole("button", { name: /экспорт/i }));

        // Проверяем, что createObjectURL вызван (с Blob)
        expect(URL.createObjectURL).toHaveBeenCalled();
        // Проверяем, что addLogEntry вызван c «UserExp экспортировал дерево»
        expect(addLogEntry).toHaveBeenCalledWith("UserExp экспортировал дерево");

        // И проверяем, что URL.revokeObjectURL тоже вызван в конце
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    test("toggle-sidebar: при клике сайдбар скрывается/показывается (класс main-content изменяется)", async () => {
        render(
            <MemoryRouter>
                <TreeApp />
            </MemoryRouter>
        );

        // Запускаем проект, чтобы main-content точно отрисовался
        fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
            target: { value: "UserTgl" },
        });
        fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
            target: { value: "projToggle" },
        });
        fireEvent.click(screen.getByRole("button", { name: /начать/i }));

        await waitFor(() => {
            expect(screen.getByTestId("mock-graph")).toBeInTheDocument();
        });

        // Находим кнопку-тоггл
        const toggleBtn = screen.getByLabelText("Toggle sidebar");
        expect(toggleBtn).toBeInTheDocument();

        // Найдём контейнер main-content
        const mainContent = document.querySelector(".main-content")!;
        expect(mainContent).toBeInTheDocument();
        // Изначально класс .main-content не содержит '--expanded'
        expect(mainContent.classList.contains("main-content--expanded")).toBe(false);

        // Кликаем, скрываем сайдбар: класс должен появиться
        fireEvent.click(toggleBtn);
        expect(mainContent.classList.contains("main-content--expanded")).toBe(true);

        // Ещё раз кликаем, показываем сайдбар: класс пропадёт
        fireEvent.click(toggleBtn);
        expect(mainContent.classList.contains("main-content--expanded")).toBe(false);
    });
});
