---
title: Examples
category: Guides
---

Still early days so I thought to compile a list of examples to get you started with writing your own projects.

## Connecting to the Smart Paci

```html
<script>
    import { Paci } from '@cuirous-inventions/smartpaci';

    const paci = new Paci();
    paci.addEventListener('bite', event => {
        console.log(`Bite amount is ${event.detail.value} out of 255`);
    });

    // Web Bluetooth will only allow connections to be made if the function was called
    // within a user invoked event. (i.e. callback when a user clicked a button).
    let connectButton = document.getElementById('connect');
    connectButton.addEventListener('click', () => paci.connect());
</script>

<button id="connect">Connect</button>
```

## Respond to Touch events

```js
import { Paci } from '@cuirous-inventions/smartpaci';

const paci = new Paci();

const touchSensorNames = ['Bottom Left', 'Top Left', 'Top Right', 'Bottom Right'];

paci.addEventListener('touch', async (event) => {
    // `touches` will contain either a 0, 1, 2, or 3 to represent the touch
    // sensors bottom-left top-left top-right or bottom-right respectively.
    const touches = event.detail.values;

    // Map the touch sensor ids to the sensor name and log them.
    touches.map((sensorId) => console.log(`Sensor ${touchSensorNames[sensorId]} is active`));
});

// ...
// Ensure this function is called within a user-invoked context.
await paci.connect();
```
