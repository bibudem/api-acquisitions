import tracer from 'tracer'
import config from 'config'

export default tracer.console({
  format: '{{timestamp}} <{{title}}> {{file}}:{{line}} ({{method}}) {{message}}',
  dateformat: "yyyy-mm-dd HH:MM:ss",
  methods: ['debug', 'info', 'log', 'warn', 'error'],
  level: config.get('log.level') || 'debug'
});