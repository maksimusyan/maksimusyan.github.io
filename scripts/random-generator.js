(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.generateSecureRandomString = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  function fallbackGetRandomValues(buffer) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 4294967296);
    }
    return buffer;
  }

  function getCrypto() {
    let crypto;

    // Браузер (включая IE)
    if (typeof window !== 'undefined') {
      crypto = window.crypto || window.msCrypto;
    } 
    // Node.js
    else if (typeof global !== 'undefined') {
      crypto = global.crypto;
    } 
    // Web Workers / Service Workers
    else if (typeof self !== 'undefined') {
      crypto = self.crypto;
    }
    
    // Возвращаем объект, содержащий метод из Crypto или "запасную" функцию
    return crypto && crypto.getRandomValues 
      ? { getRandomValues: crypto.getRandomValues.bind(crypto), isSecure: true, warning: '' }
      : { getRandomValues: fallbackGetRandomValues, isSecure: false, warning: 'Используется менее безопасный метод Math.random()!' };
  }

  function getAvailableChars(options, chars, alphanumericChars, wideChars, position) {
    // По умолчанию доступны все указанные символы 
    let availableChars = chars;
    
    // Если символ является первым
    if (position === 'first') {
      // Если включена опция "первый символ всегда буквенно-цифровой" - меняем массив символов
      if (options.firstCharAlphanumeric) availableChars = alphanumericChars;
      // Если включена опция "избегать узких символов по краям" - меняем массив символов,
      // но путём пересечения с "availableChars", чтобы учесть предыдущее условие
      if (options.avoidNarrowCharsOnEdges) availableChars = intersectChars(availableChars, wideChars);
    }
    // Если символ является последним - применяем аналогичные преобразования
    else if (position === 'last') {
      if (options.lastCharAlphanumeric) availableChars = alphanumericChars;
      if (options.avoidNarrowCharsOnEdges) availableChars = intersectChars(availableChars, wideChars);
    }
    
    // Возвращаем массив допустимых символов
    return availableChars.length > 0 ? availableChars : chars;
  }

  /**
   * Возвращает строку, состоящую из символов, которые присутствуют в обеих переданных строках.
   * Порядок символов сохраняется согласно firstString.
   * @param {string} firstString - Первая строка для сравнения символов
   * @param {string} secondString - Вторая строка для сравнения символов
   * @returns {string} Строка, содержащая только общие символы из firstString и secondString
   * @example
   * intersectStrings("abc", "bcd") → "bc"
   * intersectStrings("hello", "world") → "lo"
   * intersectStrings("123", "456") → ""
   */
  function intersectChars(firstString, secondString) {
    // Создаем Set из второй строки для быстрого поиска символов (O(1) проверка наличия)
    const secondStringChars = new Set(secondString);

    // Преобразуем первую строку в массив символов, фильтруем и оставляем только те,
    // которые есть во второй строке, затем объединяем обратно в строку
    const commonChars = Array.from(firstString)
      .filter(char => secondStringChars.has(char))
      .join('');

    return commonChars;
  }

  /**
   * 
   * @param {Object} config - Объект с настройками генерации
   * @param {String} chars Набор всех используемых символов
   * @param {String} alphanumericChars Набор цифро-буквенных символов
   * @param {String} wideChars  Набор "широких" символов
   * @returns {String} Случайная строка
   */
  function generateRandomString(config, chars, alphanumericChars, wideChars) {
      const maxAttempts = 10;
      let result = '';
      let attempts = 0;

      while (result.length < config.length && attempts < maxAttempts) {
          const remainingLength = config.length - result.length;
          const randomValues = new Uint32Array(remainingLength);
          crypto.getRandomValues(randomValues);

          let i = 0;
          while (i < remainingLength && result.length < config.length) {
              const position = result.length === 0 
                  ? 'first' 
                  : (result.length === config.length - 1 ? 'last' : 'middle');
              
              let availableChars = getAvailableChars(
                  config, 
                  chars, 
                  alphanumericChars, 
                  wideChars, 
                  position
              );

              if (availableChars.length === 0) {
                  availableChars = getAvailableChars(
                      config, 
                      chars, 
                      alphanumericChars, 
                      wideChars, 
                      'any'
                  );
              }

              if (availableChars.length > 0) {
                  const randomIndex = randomValues[i] % availableChars.length;
                  result += availableChars[randomIndex];
                  i++; // Увеличиваем счётчик только при успешном добавлении символа
              } else {
                  break; // Если символов нет, прерываем цикл
              }
          }

          attempts++;
      }

      // Добиваем строку до нужной длины, если не хватило символов
      if (result.length < config.length) {
          const fallbackChar = getAvailableChars(
              config, 
              chars, 
              alphanumericChars, 
              wideChars, 
              'any'
          )[0] || 'a';
          result += fallbackChar.repeat(config.length - result.length);
      }

      return result;
  }

  /**
   * Генерирует случайную строку с настройками
   * @param {Object} options - Объект с настройками генерации
   * @param {number} [options.length=16] - Длина строки
   * @param {boolean} [options.excludeSimilarChars=false] - Исключить похожие символы (Il!10O)
   * @param {boolean} [options.firstCharAlphanumeric=false] - Первый символ только буква/цифра
   * @param {boolean} [options.lastCharAlphanumeric=false] - Последний символ только буква/цифра
   * @param {boolean} [options.avoidNarrowCharsOnEdges=false] - Не использовать узкие символы в начале/конце
   * @param {boolean} [options.includeSpecialChars=true] - Включить спецсимволы
   * @param {boolean} [options.includeUppercase=true] - Включить буквы верхнего регистра
   * @param {boolean} [options.includeLowercase=true] - Включить буквы нижнего регистра
   * @param {boolean} [options.includeNumbers=true] - Включить цифры
   * @param {string} [options.excludeChars=''] - Строка с символами для исключения
   * @param {boolean} [options.forceFallback=false] - Принудительно использовать менее безопасный метод
   * @returns {string} - Случайная строка
   */
  function generateSecureRandomString(options = {}) {
    const crypto = getCrypto();
    if (!options.forceFallback && !crypto.isSecure && typeof console !== 'undefined' && console.warn) {
      console.warn(crypto.warning);
    }

    const config = {
      length: Math.max(1, parseInt(options.length) || 16),
      excludeSimilarChars: !!options.excludeSimilarChars,
      firstCharAlphanumeric: !!options.firstCharAlphanumeric,
      lastCharAlphanumeric: !!options.lastCharAlphanumeric,
      avoidNarrowCharsOnEdges: !!options.avoidNarrowCharsOnEdges,
      includeSpecialChars: options.includeSpecialChars !== false,
      includeUppercase: options.includeUppercase !== false,
      includeLowercase: options.includeLowercase !== false,
      includeNumbers: options.includeNumbers !== false,
      excludeChars: typeof options.excludeChars === 'string' ? options.excludeChars : '',
      forceFallback: !!options.forceFallback
    };

    // Базовые наборы символов
    let uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowercase = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = '0123456789';
    let specialChars = '!@#$%^&*()_+-=}{][|;:,.<>?';
    // Узкие символы
    const narrowChars = '1iIl|!j;:,.';

    // Исключить символы, которые можно спутать с другими символами
    if (config.excludeSimilarChars) {
      // Символы "IO" похожи на 1,l и 0
      uppercase = uppercase.replace(/[IO]/g, '');
      // Символы "l" похож на 1 и I, а "o" может быть спутана с "0",
      // если располагается рядом с "низкими" символами
      lowercase = lowercase.replace(/[lo]/g, '');
      // Символы "01" похожи на O,I и l
      numbers = numbers.replace(/[01]/g, '');
      // Символы "|!" не сильно похожи на I и l, но иногда вызывают трудности,
      // например, при печати или в некоторых шрифтах
      specialChars = specialChars.replace(/[|!]/g, '');
    }

    // Формируем основной набор символов
    let chars = '';
    if (config.includeUppercase) chars += uppercase;
    if (config.includeLowercase) chars += lowercase;
    if (config.includeNumbers) chars += numbers;
    if (config.includeSpecialChars) chars += specialChars;

    // Применяем исключения
    if (config.excludeChars) {
      // Фильтруем символы, оставляя те, которые не указаны в config.excludeChars
      chars = chars.split('').filter(char => !config.excludeChars.includes(char)).join('');
    }

    if (chars.length === 0) {
      throw new Error('Не осталось символов после применения исключений');
    }

    // Создаем буквенно-числовой набор, но с учётом предыдущих преобразований
    const alphanumericChars = intersectChars(
      (config.includeUppercase ? uppercase : '') +
      (config.includeLowercase ? lowercase : '') +
      (config.includeNumbers ? numbers : ''),
      chars
    );

    // Создаем набор только "широких" символов, но с учётом предыдущих преобразований
    const wideChars = chars.split('').filter(char => !narrowChars.includes(char)).join('');

    // Проверяем доступность символов для специальных позиций
    if (config.firstCharAlphanumeric && alphanumericChars.length === 0) {
      throw new Error('В первой позиции недоступны буквенно-цифровые символы.');
    }
    if (config.lastCharAlphanumeric && alphanumericChars.length === 0) {
      throw new Error('В последний позиции недоступны буквенно-цифровые символы');
    }
    if (config.avoidNarrowCharsOnEdges && wideChars.length === 0) {
      throw new Error('Нет широких символов для краев строки');
    }

    return generateRandomString(config, chars, alphanumericChars, wideChars);
  };

  return generateSecureRandomString;
}));