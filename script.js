function calcularPromedio() {
    const nota1 = parseFloat(document.getElementById("nota1").value);
    const nota2 = parseFloat(document.getElementById("nota2").value);
    const nota3 = parseFloat(document.getElementById("nota3").value);

    const resultado = document.getElementById("resultado");

    if (isNaN(nota1) || isNaN(nota2) || isNaN(nota3)) {
        resultado.textContent = "Ingresa las tres notas.";
        return;
    }

    const promedio = (nota1 + nota2 + nota3) / 3;

    if (promedio >= 7) {
        resultado.textContent = `Promedio: ${promedio.toFixed(2)} - Aprobado`;
    } else {
        resultado.textContent = `Promedio: ${promedio.toFixed(2)} - No aprobado`;
    }
}