(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory();
  } else {
    // Браузерный глобальный объект
    root.generateSecureRandomString = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  /**
   * Генерирует криптостойкую случайную строку с настройками
   * @param {Object} options - Объект с настройками генерации
   * @param {number} [options.length=32] - Длина строки
   * @param {boolean} [options.excludeSimilarChars=false] - Исключить похожие символы (Il1|0O)
   * @param {boolean} [options.firstCharAlphanumeric=false] - Первый символ только буква/цифра
   * @param {boolean} [options.lastCharAlphanumeric=false] - Последний символ только буква/цифра
   * @param {boolean} [options.avoidNarrowCharsOnEdges=false] - Не использовать узкие символы в начале/конце
   * @param {boolean} [options.includeSpecialChars=true] - Включить спецсимволы
   * @param {boolean} [options.includeUppercase=true] - Включить буквы верхнего регистра
   * @param {boolean} [options.includeLowercase=true] - Включить буквы нижнего регистра
   * @param {boolean} [options.includeNumbers=true] - Включить цифры
   * @param {string} [options.excludeChars=''] - Строка с символами для исключения
   * @returns {string} - Случайная строка
   */
  return function generateSecureRandomString(options = {}) {
    // Проверка поддержки Web Crypto API
    const crypto = window.crypto || window.msCrypto;
    if (!crypto || !crypto.getRandomValues) {
      throw new Error('Ваш браузер не поддерживает Web Crypto API');
    }

    // Параметры по умолчанию
    const {
      length = 32,
      excludeSimilarChars = false,
      firstCharAlphanumeric = false,
      lastCharAlphanumeric = false,
      avoidNarrowCharsOnEdges = false,
      includeSpecialChars = true,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      excludeChars = ''
    } = options;

    // Базовые наборы символов
    let uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowercase = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = '0123456789';
    let specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // Узкие символы (которые трудно выделить курсором)
    const narrowChars = '1iIl|';

    // Исключаем похожие символы если нужно
    if (excludeSimilarChars) {
      uppercase = uppercase.replace(/[Il1|0O]/g, '');
      lowercase = lowercase.replace(/[l1|o]/g, '');
      numbers = numbers.replace(/[01]/g, '');
      specialChars = specialChars.replace(/[|]/g, '');
    }

    // Формируем основной набор символов
    let chars = '';
    if (includeUppercase) chars += uppercase;
    if (includeLowercase) chars += lowercase;
    if (includeNumbers) chars += numbers;
    if (includeSpecialChars) chars += specialChars;

    // Исключаем указанные пользователем символы
    if (excludeChars) {
      const excludePattern = new RegExp(`[${excludeChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
      chars = chars.replace(excludePattern, '');
    }

    // Проверка, что есть хотя бы один символ для выбора
    if (chars.length === 0) {
      throw new Error('Нет доступных символов для генерации (все наборы исключены)');
    }

    // Набор только для букв и цифр (если нужно для первого/последнего символа)
    const alphanumericChars = (
      (includeUppercase ? uppercase : '') +
      (includeLowercase ? lowercase : '') +
      (includeNumbers ? numbers : '')
    ).replace(
      new RegExp(`[${excludeChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'),
      ''
    );

    // Набор символов без узких (для краёв строки)
    const wideChars = chars.replace(
      new RegExp(`[${narrowChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'),
      ''
    );

    // Проверка, что есть хотя бы один буквенно-цифровой символ если требуется
    if ((firstCharAlphanumeric || lastCharAlphanumeric) && alphanumericChars.length === 0) {
      throw new Error('Нет доступных буквенно-цифровых символов для первого/последнего символа');
    }

    // Проверка, что есть широкие символы если требуется avoidNarrowCharsOnEdges
    if (avoidNarrowCharsOnEdges && wideChars.length === 0) {
      throw new Error('Нет доступных широких символов для начала/конца строки');
    }

    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < length; i++) {
      let currentChars = chars;
      
      // Определяем какие символы можно использовать для текущей позиции
      if (i === 0) {
        if (firstCharAlphanumeric) currentChars = alphanumericChars;
        if (avoidNarrowCharsOnEdges) currentChars = wideChars;
      } else if (i === length - 1) {
        if (lastCharAlphanumeric) currentChars = alphanumericChars;
        if (avoidNarrowCharsOnEdges) currentChars = wideChars;
      }

      // Если после фильтрации не осталось символов - используем основной набор
      if (currentChars.length === 0) currentChars = chars;

      result += currentChars[randomValues[i] % currentChars.length];
    }

    return result;
  };
}));