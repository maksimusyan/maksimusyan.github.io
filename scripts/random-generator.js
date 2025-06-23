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
    const crypto = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) || 
                  (typeof global !== 'undefined' && global.crypto) ||
                  (typeof self !== 'undefined' && self.crypto);
    
    return crypto && crypto.getRandomValues 
      ? { getRandomValues: crypto.getRandomValues.bind(crypto), isSecure: true }
      : { getRandomValues: fallbackGetRandomValues, isSecure: false, warning: 'Using less secure Math.random() fallback!' };
  }

  function getAvailableChars(options, chars, alphanumericChars, wideChars, position) {
    let availableChars = chars;
    
    // Применяем ограничения в зависимости от позиции символа
    if (position === 'first') {
      if (options.firstCharAlphanumeric) availableChars = alphanumericChars;
      if (options.avoidNarrowCharsOnEdges) availableChars = intersectChars(availableChars, wideChars);
    } 
    else if (position === 'last') {
      if (options.lastCharAlphanumeric) availableChars = alphanumericChars;
      if (options.avoidNarrowCharsOnEdges) availableChars = intersectChars(availableChars, wideChars);
    }
    
    return availableChars.length > 0 ? availableChars : chars;
  }

  function intersectChars(chars1, chars2) {
    const set = new Set(chars2);
    return Array.from(chars1).filter(c => set.has(c)).join('');
  }

  return function generateSecureRandomString(options = {}) {
    const crypto = getCrypto();
    if (!options.forceFallback && !crypto.isSecure && typeof console !== 'undefined' && console.warn) {
      console.warn(crypto.warning);
    }

    const config = {
      length: Math.max(1, parseInt(options.length) || 32),
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
    let specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    // Узкие символы
    const narrowChars = '1iIl|!j;:,.';

    if (config.excludeSimilarChars) {
      uppercase = uppercase.replace(/[I1|0O]/g, '');
      lowercase = lowercase.replace(/[l1|o]/g, '');
      numbers = numbers.replace(/[01]/g, '');
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
      const excludePattern = new RegExp(`[${config.excludeChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
      chars = chars.replace(excludePattern, '');
    }

    if (chars.length === 0) {
      throw new Error('No available characters after exclusions');
    }

    // Создаем специализированные наборы
    const alphanumericChars = intersectChars(
      (config.includeUppercase ? uppercase : '') +
      (config.includeLowercase ? lowercase : '') +
      (config.includeNumbers ? numbers : ''),
      chars
    );

    const wideChars = chars.replace(
      new RegExp(`[${narrowChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'),
      ''
    );

    // Проверяем доступность символов для специальных позиций
    if (config.firstCharAlphanumeric && alphanumericChars.length === 0) {
      throw new Error('No alphanumeric chars available for first position');
    }
    if (config.lastCharAlphanumeric && alphanumericChars.length === 0) {
      throw new Error('No alphanumeric chars available for last position');
    }
    if (config.avoidNarrowCharsOnEdges && wideChars.length === 0) {
      throw new Error('No wide chars available for edges');
    }

    const randomValues = new Uint32Array(config.length);
    crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < config.length; i++) {
      const position = i === 0 ? 'first' : (i === config.length - 1 ? 'last' : 'middle');
      const availableChars = getAvailableChars(config, chars, alphanumericChars, wideChars, position);
      
      let char;
      let attempts = 0;
      do {
        char = availableChars[randomValues[i] % availableChars.length];
        attempts++;
      } while (attempts < 10 && config.excludeChars.includes(char)); // Дополнительная проверка на исключенные символы

      result += char || availableChars[0]; // На крайний случай берем первый доступный символ
    }

    return result;
  };
}));