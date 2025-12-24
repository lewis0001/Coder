const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// Simple Orbit-themed placeholders encoded as small PNGs (text-based source to avoid binary in repo)
const assets = {
  'icon.png': 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAB/UlEQVR4nO2bPY7bQBiGv1+RhJGwdtsIuxD2DEnsg5Q9wH4EEqtgLG4UmU+QkmZsbbS6UEtQkfBfnA6USF/N3PDMzv3trazc++9AxnEC+W+QmkpkjVVXbbfC9U779gxvt7ItUENUN0cBA2u5SRPHXgRDwNCi1er3+v29fW5vO8z9R4AyfIAAiCgExzNoZ8DhIsRZP6FcyXtl1wAU2bRvJqkXKGiEfeD6reVfd4R0Q5XQNGIP47d1RMSXYDxdZlpnpGIk7s6ZAnlwsRvuL+AzNYd6zS2DhNRayK1DlKM1cRkOaRaMbMBtfC48kCfvlT1fWpXwWNAADSeBXyVkyU+AizUgxFaEgx4J8dxNQdgFJf/+XPuOXN8XQDfU6V+ItQUzBfnLGN4CvEaaAkP1mNcO44KLLd5fS6DlWkRB9bRPGsUVTkYxj9HP3szTnDPv0PRJqGPR1KfNIBWHvBMjDoTn/ihLgwDoRTBfT47STu/vnAbSVfPwGxrcfYlqIU5+N2ul6K1PnqXyMxBv8kzG1ZcgneTiZUoijq+E4d/H4YbM6tWyOPm+rf7bsjt91cctHEObLURsXnZWV4GF6ba4xibdyZLYRh90bYe4oMNWXOXb3dCHxzk37bkKdUXV5+US4cTgEF5+oXJ5HRoZQFy+SdQiWRNCeo5cSGzpJH7nApj49pvzV+4iwyKtK0uwkyl6GQ9nxJbuGUdlwpo6lI7/PoXw27XUVed66wsAAAAASUVORK5CYII=',
  'adaptive-icon.png': 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAB9UlEQVR4nO2bMU7DQBiFP9fg8FzBQqTwDgQVyR+sSPYC4oWCCoKewEAxfQNBbxNQ+EFlggoMfQm4sCoKRGQy8h0mq+9p9nOTWbNw867s+oL+/3l3XbxEAgMt0ADLo43qXrwPNwQ6QCk1D+b2vJnF6MT1ugV4bV5khd3J5QNSj4F8oAK8gFk4GJ15FCYngYVnXT8aQJ7nCLuC0RBV+3gquBDuZ6M1mC1e2SPGCGOjiFXUDXkCTGqU2kzHiGWhKDdNe3nCaoMJ0LxPxJ1Ar07U5dNQaNvIoAFpVUEtMvq7HbtzVw0FSuqnp7ZQtgb6+0YCB5+OmDYgMQmSkUeZlC8qyY1eLBx2wxMv4c5fxWBjGXJgH6i4DOYs8jPUpDE5utEL4VPYs7MTlh+T+oSkzClGjsXFvXJoYlPAiHVp/X3io0+cARbI4Xw90jnD0bHxnB+mgqqmObYP/Kb8btlOxc7TyyLi2g39FzWy4C3HZjXqa3SN5fq96iQ1D5EUapYCXcVto3bHAbC1p2oC3e7qXMczxYPW7mgdwNnVNpAThyKjHhwUpajrxYz8cmhhWPC/Lsn9WfxAaSAq0rS7CRGthG/ltls4Sx2XDmjqUiv8B+oTUa665MAcQAAAABJRU5ErkJggg==',
  'favicon.png': 'iVBORw0KGgoAAAANSUhEUgAAAA8AAAAQCAQAAAC1+jfqAAAAJklEQVR42mNgQAN+//8/IxgGhBgNHBQnIwMOAySlkgFojcRClDDAgAEASnYNyGm+ShcAAAAASUVORK5CYII='
};

Object.entries(assets).forEach(([name, b64]) => {
  const target = path.join(assetsDir, name);
  fs.writeFileSync(target, Buffer.from(b64, 'base64'));
  console.log(`Generated ${target}`);
});
