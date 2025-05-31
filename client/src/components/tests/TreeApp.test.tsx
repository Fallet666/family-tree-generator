// src/components/tests/TreeApp.test.tsx

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TreeApp from "../TreeApp";

// 1) Мокаем FamilyTreeGraph, чтобы обойти cytoscape и jsdom-ошибки с canvas:
jest.mock("../FamilyTreeGraph", () => {
    return () => <div>MockedFamilyTreeGraph</div>;
});

beforeAll(() => {
    // 2) Полифиллим TextEncoder/TextDecoder для jsdom:
    (globalThis as any).TextEncoder = require("util").TextEncoder;
    (globalThis as any).TextDecoder = require("util").TextDecoder;
});

beforeEach(() => {
    // 3) Простой мок fetch. Приводим к any, чтобы TS не ругался на сигнатуру.
    (global as any).fetch = jest
        .fn()
        .mockImplementation((input: any) => {
            const url = input.toString();
            // Если запрос к "/api/tree", возвращаем { persons: [], relations: [] }
            if (url.includes("/api/tree")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ persons: [], relations: [] }),
                });
            }
            // Иначе – пустой объект
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

test("renders modal и после клика показывает семейное древо", async () => {
    render(
        <MemoryRouter>
            <TreeApp />
        </MemoryRouter>
    );

    // 4) Должен отобразиться заголовок формы ввода:
    expect(
        screen.getByText(/введите имя и идентификатор проекта/i)
    ).toBeInTheDocument();

    // 5) Заполняем поля:
    fireEvent.change(screen.getByPlaceholderText(/ваше имя/i), {
        target: { value: "Алексей" },
    });
    fireEvent.change(screen.getByPlaceholderText(/projectId/i), {
        target: { value: "test123" },
    });

    // 6) Кликаем «Начать»
    fireEvent.click(screen.getByRole("button", { name: /начать/i }));

    // 7) Ждём, пока отобразится заголовок «семейное древо» и наш мок-graph:
    await waitFor(() => {
        expect(screen.getByText(/семейное древо/i)).toBeInTheDocument();
        expect(screen.getByText("MockedFamilyTreeGraph")).toBeInTheDocument();
    });
});
