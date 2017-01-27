class Box extends BaseModel {
    static attributes = {
        name: null,
        x: 1,
        y: 1,
        someAttribute: 'default value',
    }
    @computed get area() {
        console.log("COMPU");
        return this.x * this.y;
    }
}
