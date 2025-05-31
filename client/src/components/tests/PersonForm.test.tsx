import { render, screen, fireEvent, act } from '@testing-library/react';
import PersonForm from '../PersonForm';
import { FamilyTree } from '../../types/FamilyTree';

const dummyTree: FamilyTree = {
    persons: [
        { id: '1', fullName: 'Андрей Иванов', birthDate: '1980-01-01', photoUrl: '' },
        { id: '2', fullName: 'Мария Петрова', birthDate: '1982-05-05', photoUrl: '' }
    ],
    relations: []
};

beforeAll(() => {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({})
        })
    ) as jest.Mock;
});

test('renders person form and adds new person', async () => {
    const mockUpdate = jest.fn();

    render(<PersonForm treeData={{ persons: [], relations: [] }} onUpdateTree={mockUpdate} currentUser="Алексей" />);

    fireEvent.change(screen.getByPlaceholderText(/ФИО/i), {
        target: { value: 'Иван Иванов' }
    });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2000-01-01' } });

    const addButton = screen.getAllByRole('button', { name: /добавить/i })[0];

    await act(async () => {
        fireEvent.click(addButton);
    });

    expect(mockUpdate).toHaveBeenCalled();
});

test('adds new person with child role', async () => {
    const mockUpdate = jest.fn();

    render(<PersonForm treeData={dummyTree} onUpdateTree={mockUpdate} currentUser="Алексей" />);

    fireEvent.change(screen.getByPlaceholderText(/ФИО/i), {
        target: { value: 'Николай Иванов' }
    });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2010-01-01' } });

    const roleSelects = screen.getAllByDisplayValue('— Роль —');
    fireEvent.change(roleSelects[0], { target: { value: 'child' } });

    const targetSelects = screen.getAllByDisplayValue('— Без связи —');
    fireEvent.change(targetSelects[0], { target: { value: '1' } });

    const addButton = screen.getAllByRole('button', { name: /добавить/i })[0];

    await act(async () => {
        fireEvent.click(addButton);
    });

    expect(mockUpdate).toHaveBeenCalled();
});

test('creates spouse relation between two people', async () => {
    const mockUpdate = jest.fn();

    render(<PersonForm treeData={dummyTree} onUpdateTree={mockUpdate} currentUser="Алексей" />);

    const roleSelects = screen.getAllByDisplayValue('— Роль —');
    fireEvent.change(roleSelects[1], { target: { value: 'spouse' } });

    fireEvent.change(screen.getByDisplayValue('— Кто —'), { target: { value: '1' } });
    fireEvent.change(screen.getByDisplayValue('— Кому —'), { target: { value: '2' } });

    const createLinkButton = screen.getByRole('button', { name: /создать связь/i });

    await act(async () => {
        fireEvent.click(createLinkButton);
    });

    expect(mockUpdate).toHaveBeenCalled();
});

test('does not create relation if same IDs selected', async () => {
    const mockUpdate = jest.fn();

    render(<PersonForm treeData={dummyTree} onUpdateTree={mockUpdate} currentUser="Алексей" />);

    const roleSelects = screen.getAllByDisplayValue('— Роль —');
    fireEvent.change(roleSelects[1], { target: { value: 'parent' } });

    fireEvent.change(screen.getByDisplayValue('— Кто —'), { target: { value: '1' } });
    fireEvent.change(screen.getByDisplayValue('— Кому —'), { target: { value: '1' } });

    const createLinkButton = screen.getByRole('button', { name: /создать связь/i });

    await act(async () => {
        fireEvent.click(createLinkButton);
    });

    expect(mockUpdate).not.toHaveBeenCalled();
});