// Validation des emails
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validation du mot de passe
export const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation du numéro de téléphone
export const validatePhone = (phone) => {
  const re = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return re.test(phone.replace(/\s/g, ''));
};

// Validation des dates
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      error: 'Dates invalides'
    };
  }
  
  if (start > end) {
    return {
      isValid: false,
      error: 'La date de début doit être antérieure à la date de fin'
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

// Validation d'une garde
export const validateGarde = (garde) => {
  const errors = [];
  
  if (!garde.date) {
    errors.push('La date est requise');
  }
  
  if (!garde.type_garde) {
    errors.push('Le type de garde est requis');
  } else if (!['jour', 'nuit', 'weekend'].includes(garde.type_garde)) {
    errors.push('Type de garde invalide');
  }
  
  if (!garde.medecin_id) {
    errors.push('Un médecin doit être assigné');
  }
  
  if (!garde.planning_id) {
    errors.push('Le planning doit être spécifié');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation d'une absence
export const validateAbsence = (absence) => {
  const errors = [];
  
  if (!absence.date_debut) {
    errors.push('La date de début est requise');
  }
  
  if (!absence.date_fin) {
    errors.push('La date de fin est requise');
  }
  
  const dateValidation = validateDateRange(absence.date_debut, absence.date_fin);
  if (!dateValidation.isValid) {
    errors.push(dateValidation.error);
  }
  
  if (!absence.type_absence) {
    errors.push('Le type d\'absence est requis');
  }
  
  if (!absence.medecin_id) {
    errors.push('Le médecin doit être spécifié');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation du profil utilisateur
export const validateProfile = (profile) => {
  const errors = [];
  
  if (!profile.nom || profile.nom.trim().length < 2) {
    errors.push('Le nom doit contenir au moins 2 caractères');
  }
  
  if (!profile.prenom || profile.prenom.trim().length < 2) {
    errors.push('Le prénom doit contenir au moins 2 caractères');
  }
  
  if (!validateEmail(profile.email)) {
    errors.push('Email invalide');
  }
  
  if (profile.telephone && !validatePhone(profile.telephone)) {
    errors.push('Numéro de téléphone invalide');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper pour afficher les erreurs
export const formatErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.join('\n');
  }
  return errors;
};

export default {
  validateEmail,
  validatePassword,
  validatePhone,
  validateDateRange,
  validateGarde,
  validateAbsence,
  validateProfile,
  formatErrors
};