class Color {

    red: number;
    green: number;
    blue: number;
    position: number;
    alpha: number;

    constructor(red: number, green: number, blue: number, alpha: number = 1, position: number = 0) {

        this.red = Math.floor(red);
        this.green = Math.floor(green);
        this.blue = Math.floor(blue);
        this.alpha = alpha;
        this.position = Math.round(position * 100) / 100;
    }

    toString() {
        return `rgba(${this.red}, ${this.green},${this.blue}, ${this.alpha})`;
    }
}

class Palette {

    private colors: Color[] = [];
    private lookup: Color[] = [];

    buildLookup() {
        this.lookup = [];
        for (var i = 0; i < 1000; i++)
            this.lookup.push(this.getColorAt(i / 1000));
    };

    getColorFromLookupAt(position: number) {
        let idx;
        if (isNaN(position))
            idx = 0;
        else
            idx = Math.floor(position * this.lookup.length);

        if (idx < 0) idx = 0;
        if (idx >= this.lookup.length) idx = this.lookup.length - 1;
        return this.lookup[idx];
    };

    getColorAt(position: number): Color {

        if (position < this.colors[0].position)
            return this.colors[0];

        if (position >= this.colors[this.colors.length - 1].position)
            return this.colors[this.colors.length - 1];

        for (let i = 0; i < this.colors.length; i++) {

            if (position >= this.colors[i].position && position < this.colors[i + 1].position) {
                var relColorAlpha = (position - this.colors[i].position) / (this.colors[i + 1].position - this.colors[i].position);
                var red = this.colors[i].red * (1 - relColorAlpha) + this.colors[i + 1].red * (relColorAlpha);
                var green = this.colors[i].green * (1 - relColorAlpha) + this.colors[i + 1].green * (relColorAlpha);
                var blue = this.colors[i].blue * (1 - relColorAlpha) + this.colors[i + 1].blue * (relColorAlpha);

                return new Color(red, green, blue, 1, position);
            }
        }
    }

    addColor(c: Color) {
        this.colors.push(c);
    }

    drawTo(ctx: CanvasRenderingContext2D, width: number, height: number) {
        for (let i: number = 0; i < width; i++) {
            let pos = i / width;

            let c = this.getColorFromLookupAt(pos);
            ctx.fillStyle = `rgb(${c.red},${c.green},${c.blue})`;
            ctx.fillRect(i, 0, 1, height);
        }
    }
}