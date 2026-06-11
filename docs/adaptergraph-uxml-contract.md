# AdapterGraph UXML Contract

AdapterGraph is the cross-repo exchange object. It is shaped as the UXML document object model plus one adapter-private metadata object.

Top-level keys are frozen in `contracts/adaptergraph-keys.json`.

AdapterGraph is plain JSON:

- no classes
- no Map or Set
- no functions
- no Date instances
- no DOM nodes
- no Three.js objects

The XML save format is UXML XML serialized from AdapterGraph. Import must restore AdapterGraph without losing leaves except declared volatile fields.
