import config from 'config'

export class Disciplines {
    static get() {
        return config.get('disciplines')
    }
}