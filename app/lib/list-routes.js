import Table from 'cli-table'

// copié de stack overflow
// http://stackoverflow.com/questions/14934452/how-to-get-all-registered-routes-in-express


export default function (baseUrl, routes) {
    var table = new Table({ head: ["", "Path"] });
    console.log('\nAPI for ' + baseUrl);
    console.log('\n********************************************');

    for (var key in routes) {
        if (routes.hasOwnProperty(key)) {
            var val = routes[key];
            if (val.route) {
                val = val.route;
                var _o = {};
                _o[val.stack[0].method] = [baseUrl + val.path];
                table.push(_o);
            }
        }
    }

    console.log(table.toString());
    return table;
};