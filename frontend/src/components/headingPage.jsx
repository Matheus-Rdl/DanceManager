import {Heading, Flex} from "@chakra-ui/react";
import HandleBack from "./handleBack";

export default function HeadingPage({content}) {
  return (
    <Flex
      alignItems="center"
      gap={2}
    >
      <HandleBack />
      <Heading size="lg" color="gray.600">{content}</Heading>
    </Flex>
  );
}
