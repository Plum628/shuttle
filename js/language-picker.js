// Global object to store update functions and config provided by main.js
window.languagePickerUpdater = {
  updateUI: null,
  showLoader: null,
  hideLoader: null,
  config: null,
  textsJson: null,
  iconsModule: null,
  currentLang: null // 新增：用于存储当前激活的语言
};

(function () {
  var LanguagePicker = function (element) {
    this.element = element;
    this.select = this.element.getElementsByTagName('select')[0];
    this.options = this.select.getElementsByTagName('option');
    // this.selectedOption = getSelectedOptionText(this); // 这一行会基于DOM，而不是实际语言，所以稍后在 initButtonPicker 中处理
    this.pickerId = this.select.getAttribute('id');
    this.trigger = false;
    this.dropdown = false;
    this.firstLanguage = false;
    // dropdown arrow inside the button element
    this.arrowSvgPath = '<svg viewBox="0 0 16 16"><polygon points="3,5 8,11 13,5 "></polygon></svg>';
    this.globeSvgPath = '<svg viewBox="0 0 16 16"><path d="M8,0C3.6,0,0,3.6,0,8s3.6,8,8,8s8-3.6,8-8S12.4,0,8,0z M13.9,7H12c-0.1-1.5-0.4-2.9-0.8-4.1 C12.6,3.8,13.6,5.3,13.9,7z M8,14c-0.6,0-1.8-1.9-2-5H10C9.8,12.1,8.6,14,8,14z M6,7c0.2-3.1,1.3-5,2-5s1.8,1.9,2,5H6z M4.9,2.9 C4.4,4.1,4.1,5.5,4,7H2.1C2.4,5.3,3.4,3.8,4.9,2.9z M2.1,9H4c0.1,1.5,0.4,2.9,0.8,4.1C3.4,12.2,2.4,10.7,2.1,9z M11.1,13.1 c0.5-1.2,0.7-2.6,0.8-4.1h1.9C13.6,10.7,12.6,12.2,11.1,13.1z"></path></svg>';

    initLanguagePicker(this);
    initLanguagePickerEvents(this);

    // Call this after initial events are set up to update button text
    // We need to defer this slightly to ensure window.languagePickerUpdater is populated
    // A more robust solution might involve an event listener, but for simplicity, a setTimeout works here
    // or better, pass the initial language during the picker's construction from main.js.
    // For now, we'll ensure initButtonPicker and initListPicker get the right info.
    updatePickerDisplay(this, window.languagePickerUpdater.currentLang);
  };

  function initLanguagePicker(picker) {
    // Before creating button/list, ensure the select element's selected option matches currentLang
    // This is crucial for getSelectedOptionText to work correctly initially
    const urlParams = new URLSearchParams(window.location.search);
    let initialLangParam = urlParams.get('lang');
    if (!initialLangParam) {
        initialLangParam = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
    }
    // Update window.languagePickerUpdater.currentLang for immediate access
    window.languagePickerUpdater.currentLang = initialLangParam;

    // Set the selected option in the actual <select> element
    for (let i = 0; i < picker.options.length; i++) {
        const optionValue = picker.options[i].value; // 'english' or 'chinese'
        const mappedValue = optionValue === 'english' ? 'en-US' : 'zh-CN';
        if (mappedValue === initialLangParam) {
            picker.options[i].selected = true;
        } else {
            picker.options[i].selected = false;
        }
    }
    picker.selectedOption = getSelectedOptionText(picker); // Now this will be correct

    // create the HTML for the custom dropdown element
    picker.element.insertAdjacentHTML('beforeend', initButtonPicker(picker) + initListPicker(picker));

    // save picker elements
    picker.dropdown = picker.element.getElementsByClassName('language-picker__dropdown')[0];
    picker.languages = picker.dropdown.getElementsByClassName('language-picker__item');
    picker.firstLanguage = picker.languages[0];
    picker.trigger = picker.element.getElementsByClassName('language-picker__button')[0];
  };

  function initLanguagePickerEvents(picker) {
    // make sure to add the icon class to the arrow dropdown inside the button element
    var svgs = picker.trigger.getElementsByTagName('svg');
    if (svgs[0]) svgs[0].classList.add('li4-icon');
    if (svgs[1]) svgs[1].classList.add('li4-icon');

    // language selection in dropdown
    initLanguageSelection(picker);

    // click events
    picker.trigger.addEventListener('click', function () {
      toggleLanguagePicker(picker, false);
    });
    // keyboard navigation
    picker.dropdown.addEventListener('keydown', function (event) {
      if (event.keyCode && event.keyCode == 38 || event.key && event.key.toLowerCase() == 'arrowup') {
        keyboardNavigatePicker(picker, 'prev');
      } else if (event.keyCode && event.keyCode == 40 || event.key && event.key.toLowerCase() == 'arrowdown') {
        keyboardNavigatePicker(picker, 'next');
      }
    });
  };

  function toggleLanguagePicker(picker, bool) {
    var ariaExpanded;
    if (bool) {
      ariaExpanded = bool;
    } else {
      ariaExpanded = picker.trigger.getAttribute('aria-expanded') == 'true' ? 'false' : 'true';
    }
    picker.trigger.setAttribute('aria-expanded', ariaExpanded);
    if (ariaExpanded == 'true') {
      picker.firstLanguage.focus(); // fallback if transition is not supported
      picker.dropdown.addEventListener('transitionend', function cb() {
        picker.firstLanguage.focus();
        picker.dropdown.removeEventListener('transitionend', cb);
      });
      // place dropdown
      placeDropdown(picker);
    }
  };

  function placeDropdown(picker) {
    var triggerBoundingRect = picker.trigger.getBoundingClientRect();
    picker.dropdown.classList.toggle('language-picker__dropdown--right', (window.innerWidth < triggerBoundingRect.left + picker.dropdown.offsetWidth));
    picker.dropdown.classList.toggle('language-picker__dropdown--up', (window.innerHeight < triggerBoundingRect.bottom + picker.dropdown.offsetHeight));
  };

  function checkLanguagePickerClick(picker, target) { // if user clicks outside the language picker -> close it
    if (!picker.element.contains(target)) toggleLanguagePicker(picker, 'false');
  };

  function moveFocusToPickerTrigger(picker) {
    if (picker.trigger.getAttribute('aria-expanded') == 'false') return;
    if (document.activeElement.closest('.language-picker__dropdown') == picker.dropdown) picker.trigger.focus();
  };

  function initButtonPicker(picker) { // create the button element -> picker trigger
    // check if we need to add custom classes to the button trigger
    var customClasses = picker.element.getAttribute('data-trigger-class') ? ' ' + picker.element.getAttribute('data-trigger-class') : '';

    const currentLangText = picker.selectedOption; // Use the text from the selected option
    const currentLangValue = picker.select.value; // 'english' or 'chinese'

    var button = '<button class="language-picker__button' + customClasses + '" aria-label="' + currentLangValue + ' ' + picker.element.getElementsByTagName('label')[0].textContent + '" aria-expanded="false" aria-controls="' + picker.pickerId + '-dropdown">';
    button = button + '<span aria-hidden="true" class="language-picker__label language-picker__flag language-picker__flag--' + currentLangValue + '">' + picker.globeSvgPath + '<em>' + currentLangText + '</em>';
    button = button + picker.arrowSvgPath + '</span>';
    return button + '</button>';
  };

  function initListPicker(picker) { // create language picker dropdown
    var list = '<div class="language-picker__dropdown" aria-describedby="' + picker.pickerId + '-description" id="' + picker.pickerId + '-dropdown">';
    list = list + '<p class="li4-sr-only" id="' + picker.pickerId + '-description">' + picker.element.getElementsByTagName('label')[0].textContent + '</p>';
    list = list + '<ul class="language-picker__list" role="listbox">';
    for (var i = 0; i < picker.options.length; i++) {
      // Use picker.options[i].selected to determine initial aria-selected state
      var selected = picker.options[i].selected ? ' aria-selected="true"' : '';
      var language = picker.options[i].getAttribute('lang');
      list = list + '<li><a lang="' + language + '" hreflang="' + language + '" href="' + getLanguageUrl(picker.options[i].value) + '"' + selected + ' role="option" data-value="' + picker.options[i].value + '" class="language-picker__item language-picker__flag language-picker__flag--' + picker.options[i].value + '"><span>' + picker.options[i].text + '</span></a></li>';
    };
    return list;
  };

  function getSelectedOptionText(picker) { // used to initialize the label of the picker trigger button
    var label = '';
    // Use selectedIndex, which would have been set by initLanguagePicker
    if ('selectedIndex' in picker.select) {
      label = picker.options[picker.select.selectedIndex].text;
    } else {
      // Fallback for browsers that don't set selectedIndex correctly after programmatic change
      const selectedOption = picker.select.querySelector('option[selected]');
      label = selectedOption ? selectedOption.text : picker.options[0].text; // Default to first if none selected
    }
    return label;
  };

  function getLanguageUrl(langValue) { // Accept langValue directly
    const currentUrl = new URL(window.location.href);
    // Map the 'english'/'chinese' values to 'en-US'/'zh-CN' as expected by updateUI
    let newLangParam = '';
    if (langValue === 'english') {
      newLangParam = 'en-US';
    } else if (langValue === 'chinese') {
      newLangParam = 'zh-CN';
    }
    currentUrl.searchParams.set('lang', newLangParam);
    return currentUrl.toString();
  };

  // Helper function to update the picker's visible display
  function updatePickerDisplay(picker, newLangParam) {
    const newLangValue = newLangParam === 'en-US' ? 'english' : 'chinese'; // Map back to option value

    // Update the actual select element's selected option
    for (let i = 0; i < picker.options.length; i++) {
      if (picker.options[i].value === newLangValue) {
        picker.options[i].selected = true;
      } else {
        picker.options[i].selected = false;
      }
    }
    picker.select.value = newLangValue; // Ensure the native select value is updated

    // Update active state in picker UI (the custom dropdown)
    const currentSelected = picker.element.getElementsByClassName('language-picker__list')[0].querySelector('[aria-selected="true"]');
    if (currentSelected) {
      currentSelected.removeAttribute('aria-selected');
    }
    const newSelected = picker.element.getElementsByClassName('language-picker__list')[0].querySelector(`[data-value="${newLangValue}"]`);
    if (newSelected) {
      newSelected.setAttribute('aria-selected', 'true');
    }

    // Update the button text and flag
    picker.trigger.getElementsByClassName('language-picker__label')[0].setAttribute('class', 'language-picker__label language-picker__flag language-picker__flag--' + newLangValue);
    picker.trigger.getElementsByClassName('language-picker__label')[0].getElementsByTagName('em')[0].textContent = getSelectedOptionText(picker); // Get text based on updated select
  }


  function initLanguageSelection(picker) {
    picker.element.getElementsByClassName('language-picker__list')[0].addEventListener('click', async function (event) {
      var language = event.target.closest('.language-picker__item');
      if (!language) return;

      event.preventDefault(); // Prevent default link behavior

      const newLangValue = language.getAttribute('data-value'); // 'english' or 'chinese'
      const newLangParam = newLangValue === 'english' ? 'en-US' : 'zh-CN'; // 'en-US' or 'zh-CN'

      // Update URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('lang', newLangParam);
      history.replaceState(null, '', currentUrl.toString());

      // Update the picker's visual display
      updatePickerDisplay(picker, newLangParam);

      picker.trigger.setAttribute('aria-expanded', 'false'); // Close dropdown after selection

      // Call the updateUI function from main.js if available
      if (window.languagePickerUpdater && window.languagePickerUpdater.updateUI) {
        if (window.languagePickerUpdater.showLoader) {
          window.languagePickerUpdater.showLoader();
        }
        try {
          // Update the global currentLang before calling updateUI
          window.languagePickerUpdater.currentLang = newLangParam;
          
          await window.languagePickerUpdater.updateUI(
            window.languagePickerUpdater.config,
            window.languagePickerUpdater.textsJson,
            window.languagePickerUpdater.iconsModule
          );

          // Re-evaluate news module loading after language change (for news.html)
          const currentPathname = window.location.pathname;
          if (currentPathname.startsWith('/news/') || currentPathname.endsWith('/news.html') || currentPathname === '/news/') {
            const newsModule = await import(new URL(window.languagePickerUpdater.config.newsJs, window.location.origin));
            await newsModule.initNews(window.languagePickerUpdater.config, window.languagePickerUpdater.config.newsJson);
          }

        } catch (error) {
          console.error('语言切换期间出错：', error);
        } finally {
          if (window.languagePickerUpdater.hideLoader) {
            window.languagePickerUpdater.hideLoader();
          }
        }
      }
    });
  };


  function keyboardNavigatePicker(picker, direction) {
    var index = Array.prototype.indexOf.call(picker.languages, document.activeElement);
    index = (direction == 'next') ? index + 1 : index - 1;
    if (index < 0) index = picker.languages.length - 1;
    if (index >= picker.languages.length) index = 0;
    picker.languages[index].focus();
  };

  //initialize the LanguagePicker objects
  var languagePicker = document.getElementsByClassName('js-language-picker');
  if (languagePicker.length > 0) {
    var pickerArray = [];
    for (var i = 0; i < languagePicker.length; i++) {
      (function (i) { pickerArray.push(new LanguagePicker(languagePicker[i])); })(i);
    }

    // listen for key events
    window.addEventListener('keyup', function (event) {
      if (event.keyCode && event.keyCode == 27 || event.key && event.key.toLowerCase() == 'escape') {
        // close language picker on 'Esc'
        pickerArray.forEach(function (element) {
          moveFocusToPickerTrigger(element);
          toggleLanguagePicker(element, 'false');
        });
      }
    });
    // close language picker when clicking outside it
    window.addEventListener('click', function (event) {
      pickerArray.forEach(function (element) {
        checkLanguagePickerClick(element, event.target);
      });
    });
  }
})();