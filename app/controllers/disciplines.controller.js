import { Disciplines } from '../models/disciplines.js'

export function getListeDisciplines(req, res, next) {
  res.json(Disciplines.get())
}