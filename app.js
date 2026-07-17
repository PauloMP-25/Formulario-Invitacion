document.addEventListener('DOMContentLoaded', () => {
  // Configuración de Google Sheets (Apps Script Web App)
  // Reemplaza esta URL con la que obtengas al desplegar tu Apps Script como aplicación web
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_WegXj7grzG-YYViOiaH1gZEC5KUn6yKO_Dn9ESxbyZb10ModWbMMkXFz8wlD4ar28Q/exec';

  // Elementos del DOM - Formulario
  const rsvpForm = document.getElementById('rsvp-form');
  const fullnameInput = document.getElementById('fullname');
  const confirmNameBtn = document.getElementById('confirm-name-btn');
  const nameMessage = document.getElementById('name-message');
  const phoneInput = document.getElementById('phone');
  const acceptRulesCheckbox = document.getElementById('accept-rules');
  const hiddenPositionInput = document.getElementById('hidden-position');
  const commentsTextarea = document.getElementById('comments');
  const courtTriggerBtn = document.getElementById('open-court-btn');
  const selectedBadge = document.getElementById('selected-badge');
  const submitBtn = document.getElementById('submit-btn');

  // Elementos del DOM - Modal
  const positionModal = document.getElementById('position-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const confirmPositionBtn = document.getElementById('confirm-position-btn');
  const courtZones = document.querySelectorAll('.court-zone');

  // Variable temporal para la selección de posiciones
  let tempSelectedPositions = [];

  // Elementos del DOM - Pantalla de Éxito
  const appMainContent = document.getElementById('app-main-content');
  const successScreen = document.getElementById('success-screen');
  const editRsvpBtn = document.getElementById('edit-rsvp-btn');
  
  // Elementos del DOM - Resumen de Éxito
  const sumName = document.getElementById('sum-name');
  const sumPhone = document.getElementById('sum-phone');
  const sumRsvp = document.getElementById('sum-rsvp');
  const sumPosition = document.getElementById('sum-position');
  const sumComments = document.getElementById('sum-comments');

  // Mapas de estados para simular :user-invalid en navegadores antiguos (Safari)
  const dirtyElements = new WeakMap();

  /* ==========================================================================
     INICIALIZACIÓN Y CARGA DE DATOS DESDE LOCALSTORAGE
     ========================================================================== */
  const init = () => {
    // Intentar cargar datos previos del jugador
    const savedData = loadRSVPData();
    if (savedData) {
      prefillForm(savedData);
    }

    // Configurar fallback para cerrar modal en clic fuera (backdrop)
    setupModalBackdropFallback();

    // Sincronizar ARIA al cambiar valores
    setupAriaSync();
  };

  const loadRSVPData = () => {
    try {
      const data = localStorage.getItem('voley_shot_rsvp');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error cargando datos de localStorage', e);
      return null;
    }
  };

  const saveRSVPData = (data) => {
    try {
      localStorage.setItem('voley_shot_rsvp', JSON.stringify(data));
    } catch (e) {
      console.error('Error guardando datos en localStorage', e);
    }
  };

  const prefillForm = (data) => {
    if (data.fullname) {
      fullnameInput.value = data.fullname;
      handleNameConfirmation(data.fullname);
    }
    if (data.phone) phoneInput.value = data.phone;
    if (data.acceptRules) acceptRulesCheckbox.checked = data.acceptRules;
    if (data.comments) commentsTextarea.value = data.comments;
    
    // Seleccionar radio de asistencia
    if (data.attendance) {
      const radio = document.querySelector(`input[name="attendance"][value="${data.attendance}"]`);
      if (radio) radio.checked = true;
    }

    // Cargar posiciones en cancha
    if (data.playerPosition) {
      hiddenPositionInput.value = data.playerPosition;
      const codes = data.playerPosition.split(',').filter(Boolean);
      updatePositionUIFromCodes(codes);
    }
  };

  /* ==========================================================================
     LÓGICA DE CONFIRMACIÓN DE NOMBRE Y MENSAJES PERSONALIZADOS
     ========================================================================== */
  const handleNameConfirmation = (nameVal) => {
    const trimmedName = nameVal.trim();
    if (trimmedName.length < 2) {
      const errorContainer = document.getElementById('fullname-error');
      errorContainer.innerHTML = '<span aria-hidden="true">⚠️</span> Debes ingresar tu nombre y confirmarlo.';
      errorContainer.style.display = 'flex';
      fullnameInput.setAttribute('aria-invalid', 'true');
      fullnameInput.classList.add('user-invalid-fallback');
      return false;
    }

    const errorContainer = document.getElementById('fullname-error');
    errorContainer.style.display = 'none';
    fullnameInput.removeAttribute('aria-invalid');
    fullnameInput.classList.remove('user-invalid-fallback');
    fullnameInput.classList.add('user-valid-fallback');

    fullnameInput.readOnly = true;
    confirmNameBtn.disabled = true;
    confirmNameBtn.textContent = '🔒 Fijado';

    const cleanName = trimmedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const exactNameLower = trimmedName.toLowerCase();
    
    let msgText = '';
    let isLove = false;

    if (exactNameLower === 'nikol') {
      msgText = '¡Gracias por venir, amorcito! 💖💑';
      isLove = true;
    } else if (cleanName === 'lia') {
      msgText = 'espero que juegues muy bien. 🏐';
    } else if (cleanName === 'joan' || cleanName === 'jhoan') {
      msgText = '¡Go show! 🚀';
    } else if (cleanName === 'luis') {
      msgText = 'Espero no ser del mismo equipo para darte en la cara. 👊😜';
    } else if (cleanName === 'renzo') {
      msgText = 'Espero que asistas. 📅';
    } else if (cleanName === 'adrian') {
      msgText = '¡Sale su volley shot! 🍹';
    } else if (cleanName === 'grelly') {
      msgText = 'Espero enfrentarnos, cuñadita. 🙌';
    } else {
      msgText = `¡Qué bueno que te unas, ${trimmedName}! Prepárate para el juego. 👋`;
    }

    nameMessage.textContent = msgText;
    nameMessage.className = 'name-message';
    if (isLove) {
      nameMessage.classList.add('message-love');
    }

    return true;
  };

  confirmNameBtn.addEventListener('click', () => {
    handleNameConfirmation(fullnameInput.value);
  });

  fullnameInput.addEventListener('input', () => {
    const errorContainer = document.getElementById('fullname-error');
    errorContainer.innerHTML = '<span aria-hidden="true">⚠️</span> Debes ingresar tu nombre y confirmarlo.';
  });

  /* ==========================================================================
     LÓGICA DEL SELECTOR DE POSICIONES (MODAL)
     ========================================================================== */
  // Función para actualizar visualmente la selección en la cancha del modal
  const updateCourtZonesHighlight = () => {
    courtZones.forEach(zone => {
      const positionCode = zone.getAttribute('data-position');
      if (tempSelectedPositions.includes(positionCode)) {
        zone.classList.add('selected');
      } else {
        zone.classList.remove('selected');
      }
    });
  };

  // Abrir Modal
  courtTriggerBtn.addEventListener('click', () => {
    courtTriggerBtn.setAttribute('aria-expanded', 'true');
    
    // Cargar estado de selección real a la variable temporal
    const currentValue = hiddenPositionInput.value.trim();
    tempSelectedPositions = currentValue ? currentValue.split(',').filter(Boolean) : [];
    
    // Reflejar la selección en la UI de la cancha
    updateCourtZonesHighlight();

    positionModal.showModal();
  });

  // Cerrar Modal (Botón Cancelar)
  closeModalBtn.addEventListener('click', () => {
    closeModal();
  });

  // Botón Confirmar Selección
  confirmPositionBtn.addEventListener('click', () => {
    // Copiar el estado temporal al input oculto real
    const codes = tempSelectedPositions.join(',');
    hiddenPositionInput.value = codes;
    
    // Actualizar la interfaz del botón selector principal
    updatePositionUIFromCodes(tempSelectedPositions);
    
    // Validar de inmediato si la posición es correcta
    validatePosition();
    
    closeModal();
  });

  // Escuchar el cierre nativo del dialog (por ejemplo, con la tecla ESC)
  positionModal.addEventListener('close', () => {
    courtTriggerBtn.setAttribute('aria-expanded', 'false');
    courtTriggerBtn.focus(); // Retornar foco por accesibilidad
  });

  const closeModal = () => {
    positionModal.close();
  };

  // Fallback de cierre por click en backdrop (Safari, Firefox anterior a v141)
  const setupModalBackdropFallback = () => {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      positionModal.addEventListener('click', (event) => {
        // Si el objetivo del click es el propio dialog (el fondo backdrop), lo cerramos
        if (event.target !== positionModal) return;

        const rect = positionModal.getBoundingClientRect();
        const isClickInsideDialog = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );

        if (!isClickInsideDialog) {
          closeModal();
        }
      });
    }
  };

  // Selección múltiple (hasta 2) con comportamiento FIFO
  courtZones.forEach(zone => {
    zone.addEventListener('click', () => {
      const positionCode = zone.getAttribute('data-position');
      
      const index = tempSelectedPositions.indexOf(positionCode);
      if (index !== -1) {
        // Si ya está seleccionada, la removemos (toggle)
        tempSelectedPositions.splice(index, 1);
      } else {
        // Si no está seleccionada
        if (tempSelectedPositions.length < 2) {
          tempSelectedPositions.push(positionCode);
        } else {
          // FIFO: removemos el elemento más antiguo y agregamos el nuevo
          tempSelectedPositions.shift();
          tempSelectedPositions.push(positionCode);
        }
      }
      
      // Actualizar el resaltado en caliente
      updateCourtZonesHighlight();
    });
  });

  const updatePositionUIFromCodes = (codesArray) => {
    if (codesArray.length === 0) {
      selectedBadge.textContent = 'Seleccionar';
      courtTriggerBtn.classList.remove('has-value');
      courtTriggerBtn.setAttribute('aria-label', 'Ninguna posición seleccionada. Pulsa para elegir.');
      return;
    }
    
    const labels = [];
    const displayLabels = [];
    
    codesArray.forEach(code => {
      const zone = document.querySelector(`.court-zone[data-position="${code}"]`);
      if (zone) {
        const zoneNameEl = zone.querySelector('.zone-name');
        const zoneLabel = zone.getAttribute('data-label') || `Posición ${code}`;
        labels.push(zoneLabel);
        
        if (zoneNameEl) {
          displayLabels.push(`${zoneNameEl.textContent} (P${code})`);
        } else {
          displayLabels.push(`P${code}`);
        }
      }
    });
    
    selectedBadge.textContent = displayLabels.join(' + ');
    courtTriggerBtn.classList.add('has-value');
    courtTriggerBtn.setAttribute('aria-label', `Posiciones seleccionadas: ${labels.join(' y ')}. Pulsa para cambiar.`);
  };

  /* ==========================================================================
     VALIDACIONES Y ESTADOS DE INTERACCIÓN (BLUR & INPUT)
     ========================================================================== */
  
  // Registrar interacciones para emular :user-invalid en navegadores incompatibles
  const markAsDirty = (element) => {
    let state = dirtyElements.get(element) || { hasInteracted: false, hasBlurred: false };
    state.hasInteracted = true;
    dirtyElements.set(element, state);
  };

  const markAsBlurred = (element) => {
    let state = dirtyElements.get(element) || { hasInteracted: false, hasBlurred: false };
    state.hasBlurred = true;
    dirtyElements.set(element, state);
  };

  const shouldShowError = (element) => {
    const state = dirtyElements.get(element);
    // Solo mostrar error si el usuario ya interactuó y desenfocó el campo
    return state && state.hasInteracted && state.hasBlurred;
  };

  const validateInput = (input, errorContainer) => {
    let isValid = true;

    // Validación específica por tipo de input
    if (input.type === 'checkbox') {
      isValid = input.checked;
    } else if (input.id === 'phone') {
      // Validar regex de celular (9 dígitos numéricos)
      const phoneRegex = /^[0-9]{9}$/;
      isValid = phoneRegex.test(input.value.trim());
    } else if (input.type === 'text') {
      isValid = input.value.trim().length >= 2;
    } else {
      isValid = input.checkValidity();
    }

    // Actualizar clases de fallback y aria-invalid
    if (!CSS.supports('selector(:user-invalid)')) {
      if (shouldShowError(input)) {
        input.classList.toggle('user-invalid-fallback', !isValid);
        input.classList.toggle('user-valid-fallback', isValid);
      }
    }

    // Mostrar/ocultar mensaje de error
    if (shouldShowError(input) && !isValid) {
      errorContainer.style.display = 'flex';
      input.setAttribute('aria-invalid', 'true');
    } else {
      // Si ya es válido o no cumple condiciones para mostrar error aún, ocultamos
      if (isValid) {
        clearErrorState(input, errorContainer);
      }
    }

    return isValid;
  };

  const clearErrorState = (input, errorContainer) => {
    errorContainer.style.display = 'none';
    input.removeAttribute('aria-invalid');
    input.classList.remove('user-invalid-fallback');
    input.classList.add('user-valid-fallback');
  };

  // Vincular eventos de validación a inputs de texto/tel/checkbox
  const setupValidationEvents = (input, errorContainer) => {
    input.addEventListener('blur', () => {
      markAsBlurred(input);
      validateInput(input, errorContainer);
    });

    input.addEventListener('input', () => {
      markAsDirty(input);
      // Validamos en tiempo real si el usuario ya cometió un error previamente para ayudar a corregirlo
      const state = dirtyElements.get(input);
      if (state && state.hasBlurred) {
        validateInput(input, errorContainer);
      }
    });

    // Para checkboxes o selecciones
    input.addEventListener('change', () => {
      markAsDirty(input);
      markAsBlurred(input);
      validateInput(input, errorContainer);
    });
  };

  setupValidationEvents(fullnameInput, document.getElementById('fullname-error'));
  setupValidationEvents(phoneInput, document.getElementById('phone-error'));
  setupValidationEvents(acceptRulesCheckbox, document.getElementById('accept-rules-error'));

  // Validación especial para radios de asistencia
  const validateAttendance = () => {
    const selectedRadio = document.querySelector('input[name="attendance"]:checked');
    const errorContainer = document.getElementById('attendance-error');
    const isValid = selectedRadio !== null;

    if (!isValid) {
      errorContainer.style.display = 'flex';
    } else {
      errorContainer.style.display = 'none';
    }
    return isValid;
  };

  // Agregar cambio a radios para ocultar el error instantáneamente
  const attendanceRadios = document.querySelectorAll('input[name="attendance"]');
  attendanceRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      validateAttendance();
    });
  });

  // Validación especial para la posición en cancha
  const validatePosition = () => {
    const value = hiddenPositionInput.value;
    const errorContainer = document.getElementById('position-error');
    const isValid = value !== '';

    if (!isValid) {
      errorContainer.style.display = 'flex';
      courtTriggerBtn.classList.add('user-invalid-fallback');
    } else {
      errorContainer.style.display = 'none';
      courtTriggerBtn.classList.remove('user-invalid-fallback');
    }
    return isValid;
  };

  // Sincronizar aria-invalid nativamente cuando cambia el estado
  const setupAriaSync = () => {
    const syncAria = (el) => {
      if (!el) return;
      const isInvalid = el.matches(':user-invalid') || el.classList.contains('user-invalid-fallback');
      el.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
    };

    document.addEventListener('blur', (e) => syncAria(e.target), true);
    document.addEventListener('input', (e) => {
      if (e.target.hasAttribute('aria-invalid')) syncAria(e.target);
    });
  };

  /* ==========================================================================
     GESTIÓN DE ENVÍO DE FORMULARIO
     ========================================================================== */
  rsvpForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // Verificar si el nombre está confirmado (es decir, el input tiene readOnly)
    const isNameConfirmed = fullnameInput.readOnly;
    if (!isNameConfirmed) {
      const errorContainer = document.getElementById('fullname-error');
      errorContainer.innerHTML = '<span aria-hidden="true">⚠️</span> Debes confirmar tu nombre antes de enviar.';
      errorContainer.style.display = 'flex';
      fullnameInput.setAttribute('aria-invalid', 'true');
      fullnameInput.classList.add('user-invalid-fallback');
      fullnameInput.focus();
      return;
    }

    // Forzar marcación de dirty y blurred en todos los elementos para validación completa
    const elementsToValidate = [fullnameInput, phoneInput, acceptRulesCheckbox];
    elementsToValidate.forEach(el => {
      markAsDirty(el);
      markAsBlurred(el);
    });

    // Ejecutar todas las validaciones
    const isNameValid = validateInput(fullnameInput, document.getElementById('fullname-error'));
    const isPhoneValid = validateInput(phoneInput, document.getElementById('phone-error'));
    const isRulesValid = validateInput(acceptRulesCheckbox, document.getElementById('accept-rules-error'));
    const isAttendanceValid = validateAttendance();
    const isPositionValid = validatePosition();

    // Si todo es válido, proceder
    if (isNameValid && isPhoneValid && isRulesValid && isAttendanceValid && isPositionValid) {
      const selectedRadio = document.querySelector('input[name="attendance"]:checked');
      
      const codes = hiddenPositionInput.value.split(',').filter(Boolean);
      const positionLabels = [];
      codes.forEach(code => {
        const zone = document.querySelector(`.court-zone[data-position="${code}"]`);
        if (zone) {
          positionLabels.push(zone.getAttribute('data-label') || `Posición ${code}`);
        }
      });
      const positionText = positionLabels.join(' y ');

      const formData = {
        fullname: fullnameInput.value.trim(),
        phone: phoneInput.value.trim(),
        acceptRules: acceptRulesCheckbox.checked,
        attendance: selectedRadio.value,
        playerPosition: hiddenPositionInput.value,
        positionLabel: positionText,
        comments: commentsTextarea.value.trim()
      };

      // Deshabilitar botón de envío y cambiar texto
      submitBtn.disabled = true;
      const submitTextEl = submitBtn.querySelector('.submit-text');
      const originalBtnText = submitTextEl.textContent;
      submitTextEl.textContent = 'Enviando...';

      // Verificar si la URL de Google Sheets está configurada
      if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== 'TU_URL_DE_APPS_SCRIPT_AQUI') {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // Evita errores de CORS al redireccionar desde Google
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        .then(() => {
          // El modo no-cors retorna una respuesta opaca pero el envío es exitoso
          saveRSVPData(formData);
          showSuccessScreen(formData);
        })
        .catch((error) => {
          console.error('Error al enviar el formulario a Google Sheets:', error);
          alert('Hubo un problema de red al guardar tu registro en Google Sheets. Por favor, intenta de nuevo.');
        })
        .finally(() => {
          // Restaurar botón de envío
          submitBtn.disabled = false;
          submitTextEl.textContent = originalBtnText;
        });
      } else {
        // Modo sin conexión / local (MOCK)
        setTimeout(() => {
          saveRSVPData(formData);
          showSuccessScreen(formData);
          submitBtn.disabled = false;
          submitTextEl.textContent = originalBtnText;
        }, 800); // Pequeña demora para simular la carga y verse profesional
      }
    } else {
      // Enfocar o hacer scroll al primer campo inválido
      focusFirstInvalidElement(isNameValid, isPhoneValid, isAttendanceValid, isRulesValid, isPositionValid);
    }
  });

  const focusFirstInvalidElement = (nameVal, phoneVal, attendanceVal, rulesVal, positionVal) => {
    if (!nameVal) {
      fullnameInput.focus();
    } else if (!phoneVal) {
      phoneInput.focus();
    } else if (!attendanceVal) {
      document.getElementById('rsvp-yes').focus();
    } else if (!positionVal) {
      courtTriggerBtn.focus();
      // Hacer scroll suave hacia el botón selector
      courtTriggerBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (!rulesVal) {
      acceptRulesCheckbox.focus();
    }
  };

  /* ==========================================================================
     PANTALLA DE ÉXITO & INTERACCIONES
     ========================================================================== */
  const showSuccessScreen = (data) => {
    // Rellenar resumen
    sumName.textContent = data.fullname;
    sumPhone.textContent = data.phone;
    sumRsvp.textContent = data.attendance;
    sumPosition.textContent = data.positionLabel;
    sumComments.textContent = data.comments ? data.comments : 'Ninguno';

    // Ocultar formulario, mostrar pantalla de éxito
    appMainContent.classList.add('hidden');
    appMainContent.setAttribute('aria-hidden', 'true');
    
    successScreen.classList.remove('hidden');
    successScreen.setAttribute('aria-hidden', 'false');
    successScreen.focus();

    // Lanzar efecto de confeti o flash mediante clases o animaciones
    triggerSuccessConfettiEffect();
  };

  const hideSuccessScreen = () => {
    // Ocultar pantalla de éxito, mostrar formulario
    successScreen.classList.add('hidden');
    successScreen.setAttribute('aria-hidden', 'true');
    
    appMainContent.classList.remove('hidden');
    appMainContent.setAttribute('aria-hidden', 'false');
  };

  // Permitir edición al pulsar "Modificar mis datos" (Interactividad post-éxito)
  editRsvpBtn.addEventListener('click', () => {
    hideSuccessScreen();
    
    // Desbloquear campo de nombre
    fullnameInput.readOnly = false;
    fullnameInput.classList.remove('user-valid-fallback');
    confirmNameBtn.disabled = false;
    confirmNameBtn.textContent = 'Confirmar';
    nameMessage.className = 'name-message hidden';
    nameMessage.textContent = '';
    
    fullnameInput.focus();
  });

  // Efecto visual divertido al completar el registro (Flash de borde de contenedor)
  const triggerSuccessConfettiEffect = () => {
    const wrapper = document.querySelector('.mobile-wrapper');
    wrapper.style.borderColor = 'var(--neon-lime)';
    wrapper.style.boxShadow = '0 0 40px rgba(57, 255, 20, 0.25), 0 0 80px rgba(0, 0, 0, 0.8)';
    
    setTimeout(() => {
      wrapper.style.borderColor = 'var(--border-glass)';
      wrapper.style.boxShadow = '0 0 60px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.05)';
    }, 2000);
  };

  // Inicializar la aplicación
  init();
});
