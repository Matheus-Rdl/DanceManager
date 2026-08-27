import { useState } from "react";

export default function fieldsServices() {
  const [fieldsList, setFieldsList] = useState([]);
  const [fieldsListByCollectionAndPage, setFieldsListByCollectionAndPage] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [refetchFields, setRefetchFields] = useState(true);

  const url = `${import.meta.env.VITE_API_URL}/fields`;

  const getFieldsByTitle = (fieldTitle) => {

    fetch(`${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          const fields = result.body.filter(
            (item) => item.collection === fieldTitle
          );
          setFieldsList(fields);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
        setRefetchFields(false)
      });
  };

  const getFieldsByCollectionAndPage = async (collection, pageId) => {
    try {
      setFieldsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/fields/by-page?collection=${collection}&pageId=${pageId}`
      );

      const data = await response.json();

      if (data.success) {
        setFieldsListByCollectionAndPage(data.body);
      } else {
        console.error("Erro ao buscar fields:", data);
        setFieldsListByCollectionAndPage([]);
      }

    } catch (error) {
      console.error("Erro ao buscar fields:", error);
      setFieldsListByCollectionAndPage([]);
    } finally {
      setFieldsLoading(false);
    }
  };

  const updateFieldsOrder = async (fields) => {
    const response = await fetch(`${url}/order`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fields),
    });

    const result = await response.json();

    return result;
  };

  return { fieldsList, fieldsLoading, refetchFields, fieldsListByCollectionAndPage, getFieldsByCollectionAndPage, getFieldsByTitle, updateFieldsOrder };
}
