// Merge profundo usado para aplicar patches parciais de configuracao.
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function mergeDeep(target, source) {
    const output = { ...target };

    for (const [key, value] of Object.entries(source || {})) {
        if (isPlainObject(value) && isPlainObject(output[key])) {
            output[key] = mergeDeep(output[key], value);
        } else {
            output[key] = value;
        }
    }

    return output;
}

module.exports = {
    mergeDeep,
};
