// ============================================================================
// server/src/routes/crudFactory.js  —  A REUSABLE "CRUD ROUTER" GENERATOR
// ----------------------------------------------------------------------------
// Almost every resource (tasks, notes, skills, projects...) needs the SAME four
// endpoints: list, create, update, delete — all scoped to the current user. Rather
// than copy-paste that for each model, this FACTORY builds those routes for ANY
// model you hand it. modules.js calls crudRouter(Task), crudRouter(Note), etc.
//
// This is the "Don't Repeat Yourself" (DRY) principle in action — a great pattern
// to learn. Every route filters by `UserId: req.userId` so users only ever touch
// their OWN data (a critical security boundary).
// ============================================================================

import { Router } from 'express';

/**
 * Standard user-scoped CRUD router for a Sequelize model.
 * hooks: { afterCreate(doc, req), afterUpdate(doc, prev, req) } — used for activity logging.
 *
 * @param Model  the Sequelize model to expose (e.g. Task).
 * @param order  default sort order for the list endpoint.
 * @param hooks  optional callbacks to run after create/update (e.g. to update the
 *               activity heatmap when a task is completed).
 */
export function crudRouter(Model, { order = [['createdAt', 'DESC']], hooks = {} } = {}) {
  const router = Router();

  // GET / — list all of THIS user's records.
  router.get('/', async (req, res, next) => {
    try {
      const docs = await Model.findAll({ where: { UserId: req.userId }, order });
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // POST / — create a record, always stamping it with the current user's id.
  router.post('/', async (req, res, next) => {
    try {
      const doc = await Model.create({ ...req.body, UserId: req.userId });
      if (hooks.afterCreate) await hooks.afterCreate(doc, req); // e.g. log activity
      res.status(201).json(doc);
    } catch (e) {
      next(e);
    }
  });

  // PUT /:id — update a record the user owns (the WHERE clause enforces ownership).
  router.put('/:id', async (req, res, next) => {
    try {
      const doc = await Model.findOne({ where: { id: req.params.id, UserId: req.userId } });
      if (!doc) return res.status(404).json({ message: 'Not found' }); // not theirs / doesn't exist
      const prev = { ...doc.get() }; // snapshot before changes (hooks may compare)
      // Strip UserId/id from the body so a client can't reassign ownership or the id.
      const { UserId, id, ...updates } = req.body;
      Object.assign(doc, updates);
      await doc.save();
      if (hooks.afterUpdate) await hooks.afterUpdate(doc, prev, req);
      res.json(doc);
    } catch (e) {
      next(e);
    }
  });

  // DELETE /:id — delete a record the user owns. destroy() returns how many rows it
  // removed; 0 means nothing matched (wrong id or not theirs) -> 404.
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
