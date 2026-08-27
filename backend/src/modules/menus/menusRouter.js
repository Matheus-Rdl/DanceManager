import express from "express";
import MenusControllers from "./menusControllers.js";

const menusRouter = express.Router()

const menusControllers = new MenusControllers()

menusRouter.get('/', async(req, res) =>{
    const { success, statusCode, body } = await menusControllers.getMenus()

    res.status(statusCode).send({success, statusCode, body})
})

menusRouter.post('/', async(req, res) => {
    const { success, statusCode, body } = await menusControllers.addMenu(req.body)

    res.status(statusCode).send({success, statusCode, body})
})

menusRouter.delete('/:id', async(req, res) => {
    const { success, statusCode, body } = await menusControllers.deleteMenu(req.params.id)

    res.status(statusCode).send({success, statusCode, body})
})

menusRouter.put('/:id', async(req, res) => {
    const { success, statusCode, body } = await menusControllers.updateMenu(req.params.id, req.body)

    res.status(statusCode).send({success, statusCode, body})
})

export default menusRouter