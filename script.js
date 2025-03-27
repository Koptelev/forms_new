document.getElementById('surveyForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const formData = new FormData(this);
    const data = {};
    
    formData.forEach((value, key) => {
        if (key.endsWith('[]')) {
            const cleanKey = key.slice(0, -2);
            if (!data[cleanKey]) data[cleanKey] = [];
            data[cleanKey].push(value);
        } else {
            data[key] = value;
        }
    });

    // Обработка "Другое" для каналов продаж, улучшений и новых идей
    const otherFields = [
        { checkbox: 'sales_channels', input: 'sales_channels_other' },
        { checkbox: 'improve_channels', input: 'improve_channels_other' },
        { checkbox: 'new_ideas', input: 'new_ideas_other' }
    ];

    otherFields.forEach(field => {
        const otherInput = document.querySelector(`textarea[name="${field.input}"]`);
        if (otherInput && otherInput.value && data[field.checkbox] && data[field.checkbox].includes(field.checkbox === 'new_ideas' ? 'Ваши идеи' : 'Другое')) {
            data[field.checkbox] = data[field.checkbox].filter(v => v !== (field.checkbox === 'new_ideas' ? 'Ваши идеи' : 'Другое'));
            data[field.checkbox].push(otherInput.value);
        }
    });

    // Собираем приоритеты задач
    const prioritiesList = document.querySelector('.sortable');
    data['priorities'] = Array.from(prioritiesList.children).map(li => li.getAttribute('data-value'));

    // Собираем приоритеты улучшений
    const improvementsList = document.querySelector('.sortable-improvements');
    data['improvement_priorities'] = Array.from(improvementsList.children).map(li => li.getAttribute('data-value'));

    console.log(data);
    localStorage.setItem('surveyData', JSON.stringify(data));
    
    fetch('https://example.com/api/submit', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    }).catch(() => console.log('Сервер недоступен, данные сохранены локально'));

    // Показываем модальное окно с кнопкой для скачивания Excel
    const modal = document.getElementById('successModal');
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <h3>Успех!</h3>
        <p>Форма успешно отправлена.</p>
        <button onclick="generateExcel()">Скачать Excel</button>
        <button onclick="document.getElementById('successModal').style.display='none'">Закрыть</button>
    `;
    modal.style.display = 'flex';
    this.reset();
});

// Функция для обновления опций во втором вопросе
function updateSecondQuestionOptions() {
    const selectedChannels = Array.from(document.querySelectorAll('input[name="sales_channels[]"]:checked'))
        .map(checkbox => checkbox.value);

    document.querySelectorAll('.sub-options').forEach(option => {
        option.style.display = 'none';
    });

    selectedChannels.forEach(channel => {
        switch(channel) {
            case 'Реклама':
                document.querySelector('.sub-options.advertising').style.display = 'block';
                break;
            case 'Звонки':
                document.querySelector('.sub-options.calls').style.display = 'block';
                break;
            case 'Рассылки':
                document.querySelector('.sub-options.emails').style.display = 'block';
                break;
        }
    });

    // "Другое" всегда видимо
    const otherCheckboxContainer = document.querySelector('input[name="improve_channels[]"][value="Другое"]').closest('.checkbox-container');
    otherCheckboxContainer.style.display = 'flex';

    // Обновляем список приоритетов улучшений
    updateImprovementPriorities();
}

// Функция для обновления списка приоритетов улучшений
function updateImprovementPriorities() {
    const improvementsList = document.querySelector('.sortable-improvements');
    improvementsList.innerHTML = ''; // Очищаем список

    const selectedImprovements = [
        ...Array.from(document.querySelectorAll('input[name="advertising_improvements[]"]:checked')).map(cb => cb.value),
        ...Array.from(document.querySelectorAll('input[name="calls_improvements[]"]:checked')).map(cb => cb.value),
        ...Array.from(document.querySelectorAll('input[name="emails_improvements[]"]:checked')).map(cb => cb.value),
        ...Array.from(document.querySelectorAll('input[name="improve_channels[]"]:checked')).map(cb => cb.value === 'Другое' ? document.querySelector('#improve_other_input').value || 'Другое' : cb.value)
    ];

    selectedImprovements.forEach(improvement => {
        const li = document.createElement('li');
        li.setAttribute('data-value', improvement);
        li.innerHTML = `<span class="text-content">${improvement}</span><span class="drag-handle">↕</span>`;
        li.setAttribute('draggable', 'true');
        improvementsList.appendChild(li);
    });
}

// Инициализация drag-and-drop для списков
function initializeSortableList(list) {
    let draggedItem = null;

    list.addEventListener('dragstart', (e) => {
        draggedItem = e.target.closest('li');
        if (draggedItem) {
            draggedItem.classList.add('dragging');
        }
    });

    list.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    list.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('li');
        if (targetItem && draggedItem && draggedItem !== targetItem && draggedItem.parentNode === targetItem.parentNode) {
            const allItems = Array.from(list.children);
            const draggedIndex = allItems.indexOf(draggedItem);
            const targetIndex = allItems.indexOf(targetItem);

            if (draggedIndex < targetIndex) {
                targetItem.after(draggedItem);
            } else {
                targetItem.before(draggedItem);
            }
        }
    });

    // Устанавливаем draggable для всех существующих элементов
    Array.from(list.children).forEach(item => {
        item.setAttribute('draggable', 'true');
    });
}

// Автоматическое расширение textarea
function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto'; // Сбрасываем высоту
    textarea.style.height = `${textarea.scrollHeight}px`; // Устанавливаем высоту по содержимому
}

// Добавляем слушатели событий
document.querySelectorAll('input[name="sales_channels[]"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateSecondQuestionOptions);
});

document.querySelectorAll('input[name="advertising_improvements[]"], input[name="calls_improvements[]"], input[name="emails_improvements[]"], input[name="improve_channels[]"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateImprovementPriorities);
});

document.querySelector('#improve_other_input').addEventListener('input', updateImprovementPriorities);

document.querySelectorAll('.expandable-textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
        adjustTextareaHeight(this);
    });
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const sortableList = document.querySelector('.sortable');
    const sortableImprovementsList = document.querySelector('.sortable-improvements');

    // Инициализируем drag-and-drop для статического списка задач
    if (sortableList) {
        initializeSortableList(sortableList);
    }

    // Инициализируем drag-and-drop для динамического списка улучшений
    if (sortableImprovementsList) {
        initializeSortableList(sortableImprovementsList);
    }

    // Первоначальное обновление второго и третьего вопросов
    updateSecondQuestionOptions();

    // Инициализация темы
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.querySelector('.theme-icon').textContent = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        document.querySelector('.theme-icon').textContent = '🌙';
    }
    
    themeToggle.addEventListener('click', toggleTheme);
});

// Функция для генерации Excel файла
function generateExcel() {
    const companyData = JSON.parse(localStorage.getItem('surveyData') || '{}');
    
    const wb = XLSX.utils.book_new();
    
    const data = [
        ['Форма предварительного опроса для Контур.Компас'],
        [''],
        ['Информация о компании'],
        ['Наименование организации:', companyData.company_name || 'Не указано'],
        [''],
        ['Ответы на вопросы:'],
        [''],
        ['Вопрос', 'Ответ'],
        ['Каналы продаж:', Array.isArray(companyData.sales_channels) ? companyData.sales_channels.join(', ') : companyData.sales_channels || 'Не указано'],
        ['Улучшения для рекламы:', Array.isArray(companyData.advertising_improvements) ? companyData.advertising_improvements.join(', ') : companyData.advertising_improvements || 'Не указано'],
        ['Улучшения для звонков:', Array.isArray(companyData.calls_improvements) ? companyData.calls_improvements.join(', ') : companyData.calls_improvements || 'Не указано'],
        ['Улучшения для рассылок:', Array.isArray(companyData.emails_improvements) ? companyData.emails_improvements.join(', ') : companyData.emails_improvements || 'Не указано'],
        ['Другие улучшения:', Array.isArray(companyData.improve_channels) ? companyData.improve_channels.join(', ') : companyData.improve_channels || 'Не указано'],
        ['Приоритетность улучшений:', Array.isArray(companyData.improvement_priorities) ? companyData.improvement_priorities.join(', ') : companyData.improvement_priorities || 'Не указано'],
        ['Приоритетные задачи (в порядке убывания):', Array.isArray(companyData.priorities) ? companyData.priorities.join(', ') : companyData.priorities || 'Не указано'],
        ['Новые идеи для бизнеса:', Array.isArray(companyData.new_ideas) ? companyData.new_ideas.join(', ') : companyData.new_ideas || 'Не указано']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 40 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Опрос');
    XLSX.writeFile(wb, 'Опрос_Контур.Компас.xlsx');
}

// Функция для переключения темы
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}
