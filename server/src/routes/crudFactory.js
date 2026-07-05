import { Router } from 'express';

/**
 * Standard user-scoped CRUD router for a Sequelize model.
 * hooks: { afterCreate(doc, req), afterUpdate(doc, prev, req) } — used for activity logging.
 */
export function crudRouter(Model, { order = [['createdAt', 'DESC']], hooks = {} } = {}) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const docs = await Model.findAll({ where: { UserId: req.userId }, order });
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const doc = await Model.create({ ...req.body, UserId: req.userId });
      if (hooks.afterCreate) await hooks.afterCreate(doc, req);
      res.status(201).json(doc);
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const doc = await Model.findOne({ where: { id: req.params.id, UserId: req.userId } });
      if (!doc) return res.status(404).json({ message: 'Not found' });
      const prev = { ...doc.get() };
      const { UserId, id, ...updates } = req.body;
      Object.assign(doc, updates);
      await doc.save();
      if (hooks.afterUpdate) await hooks.afterUpdate(doc, prev, req);
      res.json(doc);
    } catch (e) {
      next(e);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const count = await Model.destroy({ where: { id: req.params.id, UserId: req.userId } });
      if (!count) return res.status(404).json({ message: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
