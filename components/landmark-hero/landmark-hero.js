Component({
  properties: {
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    sourceVersion: { type: String, value: '' },
    landmark: { type: Object, value: null }
  },

  methods: {
    handleTap() {
      this.triggerEvent('landmarktap');
    }
  }
});
