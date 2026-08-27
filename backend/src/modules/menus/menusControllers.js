
import MenusDataAccess from "./menusDataAccess.js";
import { ok, serverError } from "../../helpers/httpResponse.js";

export default class MenusControllers {
  constructor() {
    this.dataAccess = new MenusDataAccess();
  }

  async getMenus() {
    try {
      const menus = await this.dataAccess.getMenus();
      return ok(menus);
    } catch (error) {
      return serverError(error);
    }
  }

  async addMenu(menuData) {
    try {
      const result = await this.dataAccess.addMenu(menuData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async deleteMenu(menuId) {
    try {
      const result = await this.dataAccess.deleteMenu(menuId);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async updateMenu(menuId, menuData) {
    try {
      const result = await this.dataAccess.updateMenu(menuId, menuData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }
}
