/* Aparência compartilhada pelos formulários de Pessoas e de Atividades. */
export const formInputProps = {
  bg: "white",
  h: "38px",
  px: "10px",
  borderColor: "#cfd9d7",
  borderRadius: "6px",
  fontSize: "13px",
  color: "#163b37",
  transition: "all 0.15s ease",
  _hover: { borderColor: "#8aa7a2" },
  _focus: { bg: "white", borderColor: "#0b6b5b", boxShadow: "0 0 0 1px #0b6b5b" },
  _disabled: { opacity: 1, bg: "#f4f7f6", color: "#536b67", borderColor: "#dce4e2", cursor: "default" },
};

export const formFieldWidth = field => ({
  base: "100%",
  md: field?.width || "min(520px, 100%)",
});

export const formSelectStyles = (error = false) => ({
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    backgroundColor: state.isDisabled ? "#f4f7f6" : "white",
    borderColor: error ? "#c53030" : state.isFocused ? "#0b6b5b" : "#cfd9d7",
    borderRadius: 6,
    boxShadow: state.isFocused ? "0 0 0 1px #0b6b5b" : "none",
    fontSize: 13,
    color: "#163b37",
    transition: "all 0.15s ease",
    ":hover": { borderColor: error ? "#c53030" : "#8aa7a2" },
  }),
  valueContainer: base => ({ ...base, padding: "2px 8px" }),
  multiValue: base => ({ ...base, backgroundColor: "#e7f3f0", borderRadius: 4 }),
  multiValueLabel: base => ({ ...base, color: "#174f4a", fontSize: 12 }),
  multiValueRemove: base => ({ ...base, color: "#174f4a", ":hover": { backgroundColor: "#d4ebe6", color: "#063f39" } }),
  placeholder: base => ({ ...base, color: "#7b8f8c", fontSize: 12 }),
  menu: base => ({ ...base, zIndex: 20, fontSize: 13 }),
});
