import Pako from "pako";
import { SN76489 } from "./SN76489";

export class Player
{
    private _data = new Uint8Array()
    private _chip: SN76489
    private _renderActive = false
    private _wait = 0
    private _ptr = 0
    private _loop = 0
    private _enable = false
    private _looping = false
    private _trackName = ''
    private _gameName = ''
    private _systemName = ''
    private _originalAuthor = ''
    private _releaseDate = ''
    private _whoConverted = ''

    constructor()
    {
        this._chip = new SN76489()
        this.unload()
        this.looping = false
    }

    private setAllInfo(str:string)
    {
        this._trackName = str
        this._gameName = str
        this._systemName = str
        this._originalAuthor = str
        this._releaseDate = str
        this._whoConverted = str
    }

    private resetInfo()
    {
        this.setAllInfo('No file loaded')
    }

    private readInt(off:number)
    {
        return (
            this._data[off] + 
            (this._data[off + 1] << 8) +
            (this._data[off + 2] <<16) + 
            (this._data[off + 3] <<24))
    }

    private readString(off:number)
    {
        let str = ''
        let char = 0

        while(true)
        {
            char = this._data[off] + (this._data[off + 1] << 8)
            off += 2
            if(!char) break
            str += String.fromCharCode(char)
        }
 
        return str
    }

    private skipString(off:number)
    {
        let char = 0
 
        while(true)
        {
            char = this._data[off] + (this._data[off + 1] << 8)
            off += 2
            if(!char) break
        }
 
        return off
    }

    public load(file: Uint8Array)
    {
        const unknown = 'Unknown'
        let i = 0
        let off = 0
        let len = 0
        let char = 0
        let temp = new Uint8Array()

        this.unload()

        if(!file) return false
        this._data = file
        if(!this._data) return false
 
        if(this._data[0] == 0x1f 
            && this._data[1] == 0x8b
            && this._data[2] == 0x08)
        {
            console.log("The file is compressed")
            
            off = 10
            len = this._data.length
            char = this._data[3]
            if(char & 0x04) off += (this._data[13] + (this._data[12] << 8) + 4)
            if(char & 0x08)
            {
                while(this._data[off]) off++
                off++
            }
            if(char & 0x10)
            {
                while(this._data[off]) off++
                off++
            }
            if(char & 0x02) off += 2
 
            temp = new Uint8Array(len)
            i = 0
            while(off < len)
            {
                temp[i] = this._data[off]
            	off++
                i++
            }
            this._data = temp
            //TODO: clear temp below
            //temp = null

            try
            {
                this._data = Pako.inflate(this._data, {
                    'raw': true
                })
            }
            catch (err)
            {
                console.log(err)
            }
        }
        else
        {
            console.log('The file is not compressed')
        }
 
        if(this.readInt(0) != 0x206d6756) return false
 
        this.setAllInfo('No GD3 tag found')
        this._loop = this.readInt(0x1c) + 0x1c
        this._chip.clock(this.readInt(0x0c))
        off = this.readInt(0x14)

        if(off)
        {
            if(this.readInt(off+0x14) != 0x20336447) return true
            if(this.readInt(off+0x18) != 0x00000100) return true
 
            if(off)
            {
                off += 0x20

                this._trackName = this.readString(off)
                off = this.skipString(off)
                off = this.skipString(off)

                this._gameName = this.readString(off)
                off = this.skipString(off)
                off = this.skipString(off)

                this._systemName = this.readString(off)
                off = this.skipString(off)
                off = this.skipString(off)

                this._originalAuthor = this.readString(off)
                off = this.skipString(off)
                off = this.skipString(off)

                this._releaseDate = this.readString(off)
                off = this.skipString(off)

                this._whoConverted = this.readString(off)
                off = this.skipString(off)
 
                if(this._trackName == '')      this._trackName = unknown
                if(this._gameName == '')       this._gameName = unknown
                if(this._systemName == '')     this._systemName = unknown
                if(this._originalAuthor == '') this._originalAuthor = unknown
                if(this._releaseDate == '')    this._releaseDate = unknown
                if(this._whoConverted == '')   this._whoConverted = unknown
            }
        }

        return true
    }

    public unload()
    {
        this.stop()
        //TODO: clean up the data below
        //this._data = null
        this.resetInfo()
    }

    public play()
    {
        this._chip.reset()
        this._ptr = 0x40
        this._enable = true
    }

    public stop()
    {
        this._enable = false
        while(this._renderActive)
        this._chip.reset()
    }

    public get trackName()
    {
        return this._trackName
    }

    public get gameName()
    {
        return this._gameName
    }

    public get systemName()
    {
        return this._systemName
    }

    public get originalAuthor()
    {
        return this._originalAuthor
    }

    public get releaseDate()
    {
        return this._releaseDate
    }

    public get whoConverted()
    {
        return this._whoConverted
    }

    public set looping(l:boolean)
    {
        this._looping = l
    }

    public render(buf:Float32Array, len:number)
    {
        let i = 0
        let tag = 0
        let inc = 0
 
        if(!this._enable)
        {
            for(i = 0; i < len; i++)
            {
                buf[i] = 0
                // buf[i + 1] = 0
            }
        }
        else
        {
            i = 0
            if(this._wait)
            {
                if(this._wait >= len)
                {
	                this._chip.render(buf, len)
	                this._wait -= len
	                return
                }
                else
                {
	                this._chip.render(buf, this._wait)
	                i = this._wait
                }
            }

            while(i < len)
            {
                this._wait = 0
 
                while(!this._wait)
                {
                    tag = this._data[this._ptr]
                    switch(tag)
                    {
                    case 0x4f:
                        inc = 2
                        break
                    case 0x50:
                        this._chip.write(this._data[this._ptr + 1])
                        inc = 2
                        break
                    case 0x61:
                        this._wait = this._data[this._ptr + 1] + (this._data[this._ptr + 2] << 8)
                    case 0x51:
                    case 0x52:
                    case 0x53:
                    case 0x54:
                        inc = 3
                        break;
                    case 0x62:
                        this._wait = 735
                        inc = 1
                        break
                    case 0x63:
                        this._wait = 882
                        inc = 1
                        break
                    case 0x66:
                        if(this._looping)
                        {
                            if(this.readInt(0x20)) this._ptr = this._loop; else this._ptr = 0x40
                        }
                        else
                        {
                            this._enable = false
                            this._chip.reset()
                            this._wait = 10000
                        }
                        inc = 0
                        break
                    case 0x67:
                        inc = 1
                        break
                    default:
                        if(tag >= 0x70 && tag < 0x80)
                        {
                            this._wait = (tag & 0x0f) + 1
                            inc = 1
                            break
                        }
                        if(tag >= 0x30 && tag < 0x4f)
                        {
                            inc = 2
                            break
                        }
                        if((tag >= 0x55 && tag < 0x60) || (tag >= 0xa0 && tag < 0xc0))
                        {
                            inc = 3
                            break
                        }
                        if(tag >= 0xc0 && tag < 0xe0)
                        {
                            inc = 4
                            break
                        }
                        if(tag >= 0xe1)
                        {
                            inc = 5
                            break
                        }
                        inc = 2
                    }
                    this._ptr += inc
                }

                if(i + this._wait > len)
                {
                    this._chip.render(buf, len - i)
                    this._wait -= (len - i)
                    break
                }
                this._chip.render(buf, this._wait)
                i += this._wait
            }
        }
    }
}