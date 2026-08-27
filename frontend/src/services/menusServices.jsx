import { useState } from "react";

export default function menusServices() {
  const [menusLoading, setMenusLoading] = useState(false);
  const [refetchMenus, setRefetchMenus] = useState(true);
  const [menusList, setMenusList] = useState([]);

  const url = `${import.meta.env.VITE_API_URL}/menus`;

  const addMenu = (menuData) => {

    fetch(`${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData),
    })
      .then((response) => response.json())
      .then((result) => {
        //if (result.success) {
        //  setTablesList(result.body);
        //} else {
        //console.log(result);
        //}
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
      });
  };

  const getMenus = () => {
    setMenusLoading(true);

    fetch(`${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setMenusList(result.body);
        } else {
          //console.log(result);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
        setMenusLoading(false);
        setRefetchMenus(false);
      });
  };

  const updateMenu = (menuId, menuData) => {

    console.log(menuData)
    console.log(JSON.stringify(menuData))

    fetch(`${url}/${menuId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData)
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
        } else {
          //console.log(result);
        }
      })
      .catch((error) => {
        //console.log(error);
      })
      .finally(() => {
      });
  };

  return {
    addMenu,
    getMenus,
    updateMenu,
    menusLoading,
    refetchMenus,
    menusList
  };
}
