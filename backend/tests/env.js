'use strict';

const path = require('path');

// Load test environment variables BEFORE any other imports
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });
