export class SN76489
{
    private _volA = 0
    private _volB = 0
    private _volC = 0
    private _volD = 0
    private _divA = 0
    private _divB = 0
    private _divC = 0
    private _divD = 0
    private _cntA = 0
    private _cntB = 0
    private _cntC = 0
    private _cntD = 0
    private _outA = 0
    private _outB = 0
    private _outC = 0
    private _outD = 0
    private _noiseLFSR = 0
    private _noiseTap = 0
    private _latchedChan = 0
    private _latchedVolume = false
 
    private _ticksPerSample = 0
    private _ticksCount = 0

    private volumeTable = [
        .25,.2442,.1940,.1541,.1224,.0972,.0772,.0613,.0487,.0386,.0307,.0244,.0193,.0154,.0122,0,
        -.25,-.2442,-.1940,-.1541,-.1224,-.0972,-.0772,-.0613,-.0487,-.0386,-.0307,-.0244,-.0193,-.0154,-.0122,0,
        .25,.2442,.1940,.1541,.1224,.0972,.0772,.0613,.0487,.0386,.0307,.0244,.0193,.0154,.0122,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
    ]

    constructor()
    {
        this.clock(3500000)
        this.reset()
    }

    public clock(f:number)
    {
        this._ticksPerSample = f / 16 / 44100
    }

    public reset()
    {
        this._volA = 15
        this._volB = 15
        this._volC = 15
        this._volD = 15
        this._outA = 0
        this._outB = 0
        this._outC = 0
        this._outD = 0
        this._latchedChan = 0
        this._latchedVolume = false
        this._noiseLFSR = 0x8000
        this._ticksCount = this._ticksPerSample
    }

    public getDivByNumber(chan:number)
    {
        switch(chan)
        {
        case 0: return this._divA
        case 1: return this._divB
        case 2: return this._divC
        case 3: return this._divD
        }
        return 0
    }

    public setDivByNumber(chan:number, div:number)
    {
        switch(chan)
        {
        case 0: this._divA = div; break
        case 1: this._divB = div; break
        case 2: this._divC = div; break
        case 3: this._divD = div; break
        }
    }

    public getVolByNumber(chan:number)
    {
        switch(chan)
        {
        case 0: return this._volA
        case 1: return this._volB
        case 2: return this._volC
        case 3: return this._volD
        }
        return 0
    }

    public setVolByNumber(chan:number, vol:number)
    {
        switch(chan)
        {
        case 0: this._volA = vol; break
        case 1: this._volB = vol; break
        case 2: this._volC = vol; break
        case 3: this._volD = vol; break
        }
    }

    public write(val:number)
    {
        let chan = 0
        let cdiv = 0
 
        if(val & 128)
        {
            chan = (val>>5) & 3
            cdiv = (this.getDivByNumber(chan) & 0xfff0) | (val & 15)
 
            this._latchedChan = chan
            this._latchedVolume = val & 16 ? true : false
        }
        else
        {
            chan = this._latchedChan
            cdiv = (this.getDivByNumber(chan) & 15) | ((val & 63) << 4)
        }

        if(this._latchedVolume)
        {
            this.setVolByNumber(chan, (this.getVolByNumber(chan) & 16) | (val & 15))
        }
        else
        {
            this.setDivByNumber(chan, cdiv)
            if(chan == 3)
            {
                this._noiseTap = ((cdiv >> 2) & 1) ? 9 : 1
                this._noiseLFSR = 0x8000
            }
        }
    }

    public render(buf:Float32Array, len:number)
    {
        let i = 0
        let cdiv = 0
        let tap = 0
        let out = 0
 
        for(i = 0; i < len; i++)
        {
            while(this._ticksCount > 0)
            {
                this._cntA--
                if(this._cntA < 0)
                {
                    if(this._divA > 1)
                    {
                        this._volA ^= 16
                        this._outA = this.volumeTable[this._volA]
                    }
                    this._cntA = this._divA
                }
 
                this._cntB--
                if(this._cntB < 0)
                {
                    if(this._divB > 1)
                    {
                        this._volB ^= 16
                        this._outB = this.volumeTable[this._volB]
                    }
                    this._cntB = this._divB
                }
 
                this._cntC--
                if(this._cntC < 0)
                {
                    if(this._divC > 1)
                    {
                        this._volC ^= 16
                        this._outC = this.volumeTable[this._volC]
                    }
                    this._cntC = this._divC
                }
 
                this._cntD--
                if(this._cntD < 0)
                {
                    cdiv = this._divD & 3
                    if(cdiv<3) this._cntD = 0x10 << cdiv; else this._cntD = this._divC << 1
 
                    if(this._noiseTap == 9)
                    {
                        tap = this._noiseLFSR & this._noiseTap
                        tap ^= tap >> 8
                        tap ^= tap >> 4
                        tap ^= tap >> 2
                        tap ^= tap >> 1
                        tap &= 1
                    }
                    else
                    {
                        tap = this._noiseLFSR & 1
                    }
 
                    this._noiseLFSR = (this._noiseLFSR >> 1) | (tap << 15)
                    this._volD = (this._volD & 15) | ((this._noiseLFSR & 1 ^ 1) << 4)
                    this._outD = this.volumeTable[this._volD]
                }
 
                this._ticksCount--
            }

            this._ticksCount += this._ticksPerSample
            out = this._outA + this._outB + this._outC + this._outD

            buf[i] = out
            // buf[i + 1] = out
        }
    }
}
