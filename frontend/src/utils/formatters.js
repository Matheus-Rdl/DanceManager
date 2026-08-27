// Função para formatar CPF (ex: 12345678912 → 123.456.789-12)
export function formatCPF(cpf) {
  if (!cpf) return "";
  return cpf
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatRG(rg) {
  if (!rg) return "";
  // Remove tudo que não seja número ou letra
  rg = rg.toUpperCase().replace(/[^0-9A-Z]/g, "");

  const numbers = rg.slice(0, -1); // tudo menos o último caractere
  const lastDigit = rg.slice(-1); // último caractere

  let formattedNumbers = "";

  // Formata com pontos dependendo do tamanho
  switch (numbers.length) {
    case 6:
      formattedNumbers = numbers.replace(/(\d{2})(\d{3})(\d{1})/, "$1.$2.$3");
      break;
    case 7:
      formattedNumbers = numbers.replace(/(\d{1})(\d{3})(\d{3})/, "$1.$2.$3");
      break;
    case 8:
      formattedNumbers = numbers.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
      break;
    case 9:
      formattedNumbers = numbers.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
      break;
    default:
      formattedNumbers = numbers; // não formata se tamanho inesperado
  }

  return `${formattedNumbers}-${lastDigit}`;
}


//Formatar datas vindo do mongoDB
export function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // meses começam em 0
  const year = date.getFullYear();

  return `${year}/${month}/${day}`;
}

//Formatar nomes de pessoas
export function formatName(name) {
  if (!name) return "";

  const lowercaseWords = ["de", "da", "do", "dos", "das", "e"];

  return name
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word, index) => {
      if (lowercaseWords.includes(word) && index !== 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

//Nome Proprio
export function formatProperNoun(text) {
  if (!text) return "";

  return text
    .toLowerCase() 
    .split(" ")   
    .filter(Boolean) 
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}



