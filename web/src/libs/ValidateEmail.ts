const validarEmail = (valor: any) => {
    // Regex sencilla para validar emails
    const regex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    return regex.test(valor);
  };

export { validarEmail };