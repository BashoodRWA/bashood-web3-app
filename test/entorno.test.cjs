if (typeof globalThis._chai_expect === 'undefined') globalThis._chai_expect = require('chai').expect;
const expect = globalThis._chai_expect;

describe('Test mínimo de entorno', function () {
  it('debería pasar siempre', function () {
    expect(true).to.be.true;
  });
});
