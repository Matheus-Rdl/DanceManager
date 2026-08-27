import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          primary: { value: '#013E34' },   // Tons de verde para Develop
          secondary: { value: '#2dbba3' },
          tertiary: { value: '#d1623a' },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, customConfig);

export default system;