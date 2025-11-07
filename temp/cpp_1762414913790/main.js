// Import the 'add' function from the local utils.js file
const { add } = require('./utils.js');
const { name } = require('./yash.js');

console.log(name);

const sum = add(5, 3);
console.log('The result of add(5, 3) is:', sum);