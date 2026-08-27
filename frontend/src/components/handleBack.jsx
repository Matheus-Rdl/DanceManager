/*
    Type: Component
    Name: HandleBack
    Description:
      Componente handleBack responsável por voltar uma tela do sistema, usado várias vezes.
    Author: Matheus Rodrigues
    Last Edit: 25/08/2026
*/

import { IoIosArrowDropleftCircle } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { Icon } from "@chakra-ui/react";

export default function HandleBack() {
  const navigate = useNavigate();

  //Função para voltar a tela
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Icon
      as={IoIosArrowDropleftCircle}
      color="brand.primary"
      boxSize="8"
      cursor="pointer"
      onClick={handleBack}
      _hover={{ opacity: 0.8, transform: "scale(1.05)" }}
      transition="all 0.2s"
    />
  );
}
