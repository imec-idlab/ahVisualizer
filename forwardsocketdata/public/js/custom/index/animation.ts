
abstract class Animation {

    protected time: number = 0;
    color: Color = new Color(0, 0, 0, 1, 0);
    abstract draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number);

    update(dt: number) {
        this.time += dt;
    }

    abstract isFinished(): boolean;
}

class BroadcastAnimation extends Animation {

    max_radius: number = 50;
    max_time: number = 1000;

    constructor(private x: number, private y: number) {
        super();
        this.color = new Color(255, 0, 0);
    }

    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number) {

        let radius = this.time / this.max_time * this.max_radius;

        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    isFinished(): boolean {
        return this.time >= this.max_time;
    }
}

class ReceivedAnimation extends Animation {

    max_radius: number = 10;
    max_time: number = 1000;

    constructor(private x: number, private y: number) {
        super();
        this.color = new Color(0, 255, 0);
    }

    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number) {

        let radius = (1 - this.time / this.max_time) * this.max_radius;

        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    isFinished(): boolean {
        return this.time >= this.max_time;
    }
}


class AssociatedAnimation extends Animation {

    max_time: number = 3000;

    constructor(private x: number, private y: number) {
        super();
    }

    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number) {

        let offset = this.time / this.max_time * Math.PI * 2;

        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.setLineDash(([10, 2]));
        ctx.lineWidth = 3;
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), 10, offset, offset + Math.PI * 2, false);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    }

    isFinished(): boolean {
        return this.time >= this.max_time;
    }
}
