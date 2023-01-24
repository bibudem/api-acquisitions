import config from 'config'

import { db } from '../db/index.js'

const nacqs = db.collection('nacqs')

const projection = {
    _id: false
}

const sort = {
    datenouveaute: -1
}

function addedDate() {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return today
}

function periode2Date(periode) {
    const date = new Date();
    date.setDate(date.getDate() - periode);
    return date.toISOString().split('T')[0]
}

export class Nacq {
    static async get({
        discipline = null,
        limite = 1000,
        periode = 7
    } = {}) {

        const filter = {}
        const options = {}

        if (discipline !== null) {
            if (Array.isArray(discipline)) {
                filter.$or = discipline.map(discipline => ({ disciplines: discipline }))
            } else {
                filter.disciplines = discipline
            }
        }

        if (periode !== null) {

            filter.datenouveaute = {
                $gte: new Date(periode2Date(periode))
            }
        }

        options.projection = projection

        const aggregation = [
            {
                $match: filter
            },
            {
                $sample: {
                    size: limite
                }
            },
            {
                $sort: sort
            },
            {
                $project: projection
            }

        ]

        console.log('aggregation: ', aggregation)

        return await nacqs.aggregate(aggregation).toArray()
    }

    static async upsert(nacq) {
        // nacq.datenouveaute = addedDate()
        nacq.datederniermiseajour = new Date()

        return await nacqs.updateOne({ id: nacq.id }, { $set: nacq }, { upsert: true })
    }

    static async deleteExpired(ttl = config.get('nacqsTtl')) {
        const dateNouveaute = new Date();
        dateNouveaute.setDate(dateNouveaute.getDate() - ttl);

        return await nacqs.deleteMany({
            datenouveaute: {
                $lt: dateNouveaute
            }
        })
    }
}