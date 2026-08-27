import express from "express";
import FieldsControllers from "./fieldsControllers.js";

const fieldsRouter = express.Router()

const fieldsControllers = new FieldsControllers()

fieldsRouter.get('/', async (req, res) => {
    const { success, statusCode, body } = await fieldsControllers.getFields()

    res.status(statusCode).send({ success, statusCode, body })
});

fieldsRouter.get('/by-page', async (req, res) => {
    const { collection, pageId } = req.query;
    const { success, statusCode, body } = await fieldsControllers.getFieldsByCollectionAndPage(collection, pageId);

    res.status(statusCode).send({ success, statusCode, body });
});

fieldsRouter.post('/', async (req, res) => {
    const { success, statusCode, body } = await fieldsControllers.addField(req.body)

    res.status(statusCode).send({ success, statusCode, body })
})

fieldsRouter.delete('/:id', async (req, res) => {
    const { success, statusCode, body } = await fieldsControllers.deleteField(req.params.id)

    res.status(statusCode).send({ success, statusCode, body })
})

fieldsRouter.put('/order', async (req, res) => {
    const { success, statusCode, body } = await fieldsControllers.updateFieldsOrder(req.body);

    res.status(statusCode).send({ success, statusCode, body });
});

fieldsRouter.put('/:id', async (req, res) => {
    const { success, statusCode, body } = await fieldsControllers.updateField(req.params.id, req.body)

    res.status(statusCode).send({ success, statusCode, body })
})


export default fieldsRouter