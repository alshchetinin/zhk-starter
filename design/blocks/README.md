# Прототипы блоков

Директория для PNG прототипов блоков сайта.

## Именование

- Файлы: `kebab-case.png` — имя файла = тип блока
- Примеры: `hero.png`, `pricing-table.png`, `testimonials.png`

## Workflow

1. Положить PNG прототип в эту папку
2. Сказать AI: «создай блок из design/blocks/hero.png»
3. AI проанализирует изображение и предложит структуру полей
4. После подтверждения — создаст JSON конфиг и запустит генератор
5. Генератор создаст schema + admin editor + web renderer
6. AI доработает web renderer по прототипу

## JSON конфиг

Автоматически создаётся рядом с PNG (`hero.json`):

```json
{
  "name": "hero",
  "label": "Главный баннер",
  "description": "Баннер с заголовком и кнопкой",
  "icon": "i-solar-gallery-linear",
  "fields": [
    { "name": "title", "type": "string", "label": "Заголовок", "required": true },
    { "name": "subtitle", "type": "text", "label": "Подзаголовок", "required": false }
  ]
}
```

## Типы полей

| Тип | Описание |
|---|---|
| `string` | Строка (UInput) |
| `text` | Многострочный текст (UTextarea) |
| `richtext` | Форматированный текст (UEditor) |
| `number` | Число |
| `boolean` | Переключатель (USwitch) |
| `url` | URL-ссылка |
| `image` | Изображение (загрузка в S3) |
| `images` | Галерея изображений |
| `select` | Выбор из списка (нужны `options`) |
| `repeater` | Повторяемый блок (нужны `subFields`, опционально `minItems`/`maxItems`) |
