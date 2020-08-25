// Ported from https://github.com/ethereumjs/ethereumjs-abi
// petejkim: Replaced external dependencies with my own implementations and
// added TypeScript typings
//
// The MIT License (MIT)
//
// Copyright (c) 2015 Alex Beregszaszi
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const BN = require("bn.js");
const createKeccakHash = require("keccak");

function keccak256(data) {
  return createKeccakHash("keccak256").update(data).digest();
}

function setLengthLeft(buf, length) {
  const bufLen = buf.length;
  let b;
  if (bufLen === length) {
    b = [buf];
  } else if (bufLen > length) {
    b = [buf.slice(-length)];
  } else {
    b = [Buffer.alloc(length - bufLen), buf];
  }
  return Buffer.concat(b);
}

function setLengthRight(buf, length) {
  const bufLen = buf.length;
  let b;
  if (bufLen === length) {
    b = [buf];
  } else if (bufLen > length) {
    b = [buf.slice(0, length)];
  } else {
    b = [buf, Buffer.alloc(length - bufLen)];
  }
  return Buffer.concat(b);
}

const ABI = {};

// Convert from short to canonical names
// FIXME: optimise or make this nicer?
function elementaryName(name) {
  if (name.startsWith("int[")) {
    return "int256" + name.slice(3);
  } else if (name === "int") {
    return "int256";
  } else if (name.startsWith("uint[")) {
    return "uint256" + name.slice(4);
  } else if (name === "uint") {
    return "uint256";
  } else if (name.startsWith("fixed[")) {
    return "fixed128x128" + name.slice(5);
  } else if (name === "fixed") {
    return "fixed128x128";
  } else if (name.startsWith("ufixed[")) {
    return "ufixed128x128" + name.slice(6);
  } else if (name === "ufixed") {
    return "ufixed128x128";
  }
  return name;
}

ABI.eventID = function (name, types) {
  // FIXME: use node.js util.format?
  const sig = name + "(" + types.map(elementaryName).join(",") + ")";
  return keccak256(Buffer.from(sig));
};

ABI.methodID = function (name, types) {
  return ABI.eventID(name, types).slice(0, 4);
};

// Parse N from type<N>
function parseTypeN(type) {
  return parseInt(/^\D+(\d+)$/.exec(type)[1], 10);
}

// Parse N,M from type<N>x<M>
function parseTypeNxM(type) {
  const tmp = /^\D+(\d+)x(\d+)$/.exec(type);
  return [parseInt(tmp[1], 10), parseInt(tmp[2], 10)];
}

// Parse N in type[<N>] where "type" can itself be an array type.
function parseTypeArray(type) {
  const tmp = type.match(/(.*)\[(.*?)\]$/);
  if (tmp) {
    return tmp[2] === "" ? "dynamic" : parseInt(tmp[2], 10);
  }
  return null;
}

function parseNumber(arg) {
  const type = typeof arg;
  if (type === "string") {
    if (arg.startsWith("0x")) {
      return new BN(arg.slice(2), 16);
    } else {
      return new BN(arg, 10);
    }
  } else if (type === "number") {
    return new BN(arg);
  } else if (arg.toArray) {
    // assume this is a BN for the moment, replace with BN.isBN soon
    return arg;
  } else {
    throw new Error("Argument is not a number");
  }
}

// someMethod(bytes,uint)
// someMethod(bytes,uint):(boolean)
function parseSignature(sig) {
  const tmp = /^(\w+)\((.*)\)$/.exec(sig);

  if (tmp.length !== 3) {
    throw new Error("Invalid method signature");
  }

  const args = /^(.+)\):\((.+)$/.exec(tmp[2]);

  if (args !== null && args.length === 3) {
    return {
      method: tmp[1],
      args: args[1].split(","),
      retargs: args[2].split(","),
    };
  } else {
    let params = tmp[2].split(",");
    if (params.length === 1 && params[0] === "") {
      // Special-case (possibly naive) fixup for functions that take no arguments.
      // TODO: special cases are always bad, but this makes the function return
      // match what the calling functions expect
      params = [];
    }
    return {
      method: tmp[1],
      args: params,
    };
  }
}

// Encodes a single item (can be dynamic array)
// @returns: Buffer
function encodeSingle(type, arg) {
  let size, num, ret, i;

  if (type === "address") {
    return encodeSingle("uint160", parseNumber(arg));
  } else if (type === "bool") {
    return encodeSingle("uint8", arg ? 1 : 0);
  } else if (type === "string") {
    return encodeSingle("bytes", Buffer.from(arg, "utf8"));
  } else if (isArray(type)) {
    // this part handles fixed-length ([2]) and variable length ([]) arrays
    // NOTE: we catch here all calls to arrays, that simplifies the rest
    if (typeof arg.length === "undefined") {
      throw new Error("Not an array?");
    }
    size = parseTypeArray(type);
    if (size !== "dynamic" && size !== 0 && arg.length > size) {
      throw new Error("Elements exceed array size: " + size);
    }
    ret = [];
    type = type.slice(0, type.lastIndexOf("["));
    if (typeof arg === "string") {
      arg = JSON.parse(arg);
    }
    for (i in arg) {
      ret.push(encodeSingle(type, arg[i]));
    }
    if (size === "dynamic") {
      const length = encodeSingle("uint256", arg.length);
      ret.unshift(length);
    }
    return Buffer.concat(ret);
  } else if (type === "bytes") {
    arg = Buffer.from(arg);

    ret = Buffer.concat([encodeSingle("uint256", arg.length), arg]);

    if (arg.length % 32 !== 0) {
      ret = Buffer.concat([ret, Buffer.alloc(32 - (arg.length % 32))]);
    }

    return ret;
  } else if (type.startsWith("bytes")) {
    size = parseTypeN(type);
    if (size < 1 || size > 32) {
      throw new Error("Invalid bytes<N> width: " + size);
    }

    return setLengthRight(arg, 32);
  } else if (type.startsWith("uint")) {
    size = parseTypeN(type);
    if (size % 8 || size < 8 || size > 256) {
      throw new Error("Invalid uint<N> width: " + size);
    }

    num = parseNumber(arg);
    if (num.bitLength() > size) {
      throw new Error(
        "Supplied uint exceeds width: " + size + " vs " + num.bitLength()
      );
    }

    if (num < 0) {
      throw new Error("Supplied uint is negative");
    }

    return num.toArrayLike(Buffer, "be", 32);
  } else if (type.startsWith("int")) {
    size = parseTypeN(type);
    if (size % 8 || size < 8 || size > 256) {
      throw new Error("Invalid int<N> width: " + size);
    }

    num = parseNumber(arg);
    if (num.bitLength() > size) {
      throw new Error(
        "Supplied int exceeds width: " + size + " vs " + num.bitLength()
      );
    }

    return num.toTwos(256).toArrayLike(Buffer, "be", 32);
  } else if (type.startsWith("ufixed")) {
    size = parseTypeNxM(type);

    num = parseNumber(arg);

    if (num < 0) {
      throw new Error("Supplied ufixed is negative");
    }

    return encodeSingle("uint256", num.mul(new BN(2).pow(new BN(size[1]))));
  } else if (type.startsWith("fixed")) {
    size = parseTypeNxM(type);

    return encodeSingle(
      "int256",
      parseNumber(arg).mul(new BN(2).pow(new BN(size[1])))
    );
  }

  throw new Error("Unsupported or invalid type: " + type);
}

// Decodes a single item (can be dynamic array)
// @returns: array
// FIXME: this method will need a lot of attention at checking limits and validation
function decodeSingle(parsedType, data, offset) {
  if (typeof parsedType === "string") {
    parsedType = parseType(parsedType);
  }
  let size, num, ret, i;

  if (parsedType.name === "address") {
    return decodeSingle(parsedType.rawType, data, offset)
      .toArrayLike(Buffer, "be", 20)
      .toString("hex");
  } else if (parsedType.name === "bool") {
    return (
      decodeSingle(parsedType.rawType, data, offset).toString() ===
      new BN(1).toString()
    );
  } else if (parsedType.name === "string") {
    const bytes = decodeSingle(parsedType.rawType, data, offset);
    return Buffer.from(bytes, "utf8").toString();
  } else if (parsedType.isArray) {
    // this part handles fixed-length arrays ([2]) and variable length ([]) arrays
    // NOTE: we catch here all calls to arrays, that simplifies the rest
    ret = [];
    size = parsedType.size;

    if (parsedType.size === "dynamic") {
      offset = decodeSingle("uint256", data, offset).toNumber();
      size = decodeSingle("uint256", data, offset).toNumber();
      offset = offset + 32;
    }
    for (i = 0; i < size; i++) {
      const decoded = decodeSingle(parsedType.subArray, data, offset);
      ret.push(decoded);
      offset += parsedType.subArray.memoryUsage;
    }
    return ret;
  } else if (parsedType.name === "bytes") {
    offset = decodeSingle("uint256", data, offset).toNumber();
    size = decodeSingle("uint256", data, offset).toNumber();
    return data.slice(offset + 32, offset + 32 + size);
  } else if (parsedType.name.startsWith("bytes")) {
    return data.slice(offset, offset + parsedType.size);
  } else if (parsedType.name.startsWith("uint")) {
    num = new BN(data.slice(offset, offset + 32), 16, "be");
    if (num.bitLength() > parsedType.size) {
      throw new Error(
        "Decoded int exceeds width: " +
          parsedType.size +
          " vs " +
          num.bitLength()
      );
    }
    return num;
  } else if (parsedType.name.startsWith("int")) {
    num = new BN(data.slice(offset, offset + 32), 16, "be").fromTwos(256);
    if (num.bitLength() > parsedType.size) {
      throw new Error(
        "Decoded uint exceeds width: " +
          parsedType.size +
          " vs " +
          num.bitLength()
      );
    }

    return num;
  } else if (parsedType.name.startsWith("ufixed")) {
    size = new BN(2).pow(new BN(parsedType.size[1]));
    num = decodeSingle("uint256", data, offset);
    if (!num.mod(size).isZero()) {
      throw new Error("Decimals not supported yet");
    }
    return num.div(size);
  } else if (parsedType.name.startsWith("fixed")) {
    size = new BN(2).pow(new BN(parsedType.size[1]));
    num = decodeSingle("int256", data, offset);
    if (!num.mod(size).isZero()) {
      throw new Error("Decimals not supported yet");
    }
    return num.div(size);
  }
  throw new Error("Unsupported or invalid type: " + parsedType.name);
}

// Parse the given type
// @returns: {} containing the type itself, memory usage and (including size and subArray if applicable)
function parseType(type) {
  let size;
  let ret;
  if (isArray(type)) {
    size = parseTypeArray(type);
    let subArray = type.slice(0, type.lastIndexOf("["));
    subArray = parseType(subArray);
    ret = {
      isArray: true,
      name: type,
      size: size,
      memoryUsage: size === "dynamic" ? 32 : subArray.memoryUsage * size,
      subArray: subArray,
    };
    return ret;
  } else {
    let rawType;
    switch (type) {
      case "address":
        rawType = "uint160";
        break;
      case "bool":
        rawType = "uint8";
        break;
      case "string":
        rawType = "bytes";
        break;
    }
    ret = {
      rawType: rawType,
      name: type,
      memoryUsage: 32,
    };

    if (
      (type.startsWith("bytes") && type !== "bytes") ||
      type.startsWith("uint") ||
      type.startsWith("int")
    ) {
      ret.size = parseTypeN(type);
    } else if (type.startsWith("ufixed") || type.startsWith("fixed")) {
      ret.size = parseTypeNxM(type);
    }

    if (
      type.startsWith("bytes") &&
      type !== "bytes" &&
      (ret.size < 1 || ret.size > 32)
    ) {
      throw new Error("Invalid bytes<N> width: " + ret.size);
    }
    if (
      (type.startsWith("uint") || type.startsWith("int")) &&
      (ret.size % 8 || ret.size < 8 || ret.size > 256)
    ) {
      throw new Error("Invalid int/uint<N> width: " + ret.size);
    }
    return ret;
  }
}

// Is a type dynamic?
function isDynamic(type) {
  // FIXME: handle all types? I don't think anything is missing now
  return (
    type === "string" || type === "bytes" || parseTypeArray(type) === "dynamic"
  );
}

// Is a type an array?
function isArray(type) {
  return type.lastIndexOf("]") === type.length - 1;
}

// Encode a method/event with arguments
// @types an array of string type names
// @args  an array of the appropriate values
ABI.rawEncode = function (types, values) {
  const output = [];
  const data = [];

  let headLength = 0;

  types.forEach(function (type) {
    if (isArray(type)) {
      const size = parseTypeArray(type);

      if (size !== "dynamic") {
        headLength += 32 * size;
      } else {
        headLength += 32;
      }
    } else {
      headLength += 32;
    }
  });

  for (let i = 0; i < types.length; i++) {
    const type = elementaryName(types[i]);
    const value = values[i];
    const cur = encodeSingle(type, value);

    // Use the head/tail method for storing dynamic data
    if (isDynamic(type)) {
      output.push(encodeSingle("uint256", headLength));
      data.push(cur);
      headLength += cur.length;
    } else {
      output.push(cur);
    }
  }

  return Buffer.concat(output.concat(data));
};

ABI.rawDecode = function (types, data) {
  const ret = [];
  data = Buffer.from(data);
  let offset = 0;
  for (let i = 0; i < types.length; i++) {
    const type = elementaryName(types[i]);
    const parsed = parseType(type, data, offset);
    const decoded = decodeSingle(parsed, data, offset);
    offset += parsed.memoryUsage;
    ret.push(decoded);
  }
  return ret;
};

ABI.simpleEncode = function (method) {
  const args = Array.prototype.slice.call(arguments).slice(1);
  const sig = parseSignature(method);

  // FIXME: validate/convert arguments
  if (args.length !== sig.args.length) {
    throw new Error("Argument count mismatch");
  }

  return Buffer.concat([
    ABI.methodID(sig.method, sig.args),
    ABI.rawEncode(sig.args, args),
  ]);
};

ABI.simpleDecode = function (method, data) {
  const sig = parseSignature(method);

  // FIXME: validate/convert arguments
  if (!sig.retargs) {
    throw new Error("No return values in method");
  }

  return ABI.rawDecode(sig.retargs, data);
};

function stringify(type, value) {
  if (type.startsWith("address") || type.startsWith("bytes")) {
    return "0x" + value.toString("hex");
  } else {
    return value.toString();
  }
}

ABI.stringify = function (types, values) {
  const ret = [];

  for (const i in types) {
    const type = types[i];
    let value = values[i];

    // if it is an array type, concat the items
    // eslint-disable-next-line no-useless-escape
    if (/^[^\[]+\[.*\]$/.test(type)) {
      value = value
        .map(function (item) {
          return stringify(type, item);
        })
        .join(", ");
    } else {
      value = stringify(type, value);
    }

    ret.push(value);
  }

  return ret;
};

ABI.solidityHexValue = function (type, value, bitsize) {
  // pass in bitsize = null if use default bitsize
  let size, num;
  if (isArray(type)) {
    const subType = type.replace(/\[.*?\]/, "");
    if (!isArray(subType)) {
      const arraySize = parseTypeArray(type);
      if (
        arraySize !== "dynamic" &&
        arraySize !== 0 &&
        value.length > arraySize
      ) {
        throw new Error("Elements exceed array size: " + arraySize);
      }
    }
    const arrayValues = value.map(function (v) {
      return ABI.solidityHexValue(subType, v, 256);
    });
    return Buffer.concat(arrayValues);
  } else if (type === "bytes") {
    return value;
  } else if (type === "string") {
    return Buffer.from(value, "utf8");
  } else if (type === "bool") {
    bitsize = bitsize || 8;
    const padding = Array(bitsize / 4).join("0");
    return Buffer.from(value ? padding + "1" : padding + "0", "hex");
  } else if (type === "address") {
    let bytesize = 20;
    if (bitsize) {
      bytesize = bitsize / 8;
    }
    return setLengthLeft(value, bytesize);
  } else if (type.startsWith("bytes")) {
    size = parseTypeN(type);
    if (size < 1 || size > 32) {
      throw new Error("Invalid bytes<N> width: " + size);
    }

    return setLengthRight(value, size);
  } else if (type.startsWith("uint")) {
    size = parseTypeN(type);
    if (size % 8 || size < 8 || size > 256) {
      throw new Error("Invalid uint<N> width: " + size);
    }

    num = parseNumber(value);
    if (num.bitLength() > size) {
      throw new Error(
        "Supplied uint exceeds width: " + size + " vs " + num.bitLength()
      );
    }

    bitsize = bitsize || size;
    return num.toArrayLike(Buffer, "be", bitsize / 8);
  } else if (type.startsWith("int")) {
    size = parseTypeN(type);
    if (size % 8 || size < 8 || size > 256) {
      throw new Error("Invalid int<N> width: " + size);
    }

    num = parseNumber(value);
    if (num.bitLength() > size) {
      throw new Error(
        "Supplied int exceeds width: " + size + " vs " + num.bitLength()
      );
    }

    bitsize = bitsize || size;
    return num.toTwos(size).toArrayLike(Buffer, "be", bitsize / 8);
  } else {
    // FIXME: support all other types
    throw new Error("Unsupported or invalid type: " + type);
  }
};

ABI.solidityPack = function (types, values) {
  if (types.length !== values.length) {
    throw new Error("Number of types are not matching the values");
  }

  const ret = [];

  for (let i = 0; i < types.length; i++) {
    const type = elementaryName(types[i]);
    const value = values[i];
    ret.push(ABI.solidityHexValue(type, value, null));
  }

  return Buffer.concat(ret);
};

ABI.soliditySHA3 = function (types, values) {
  return keccak256(ABI.solidityPack(types, values));
};

// Serpent's users are familiar with this encoding
// - s: string
// - b: bytes
// - b<N>: bytes<N>
// - i: int256
// - a: int256[]

function isNumeric(c) {
  // FIXME: is this correct? Seems to work
  return c >= "0" && c <= "9";
}

// For a "documentation" refer to https://github.com/ethereum/serpent/blob/develop/preprocess.cpp
ABI.fromSerpent = function (sig) {
  const ret = [];
  for (let i = 0; i < sig.length; i++) {
    const type = sig[i];
    if (type === "s") {
      ret.push("bytes");
    } else if (type === "b") {
      let tmp = "bytes";
      let j = i + 1;
      while (j < sig.length && isNumeric(sig[j])) {
        tmp += sig[j] - "0";
        j++;
      }
      i = j - 1;
      ret.push(tmp);
    } else if (type === "i") {
      ret.push("int256");
    } else if (type === "a") {
      ret.push("int256[]");
    } else {
      throw new Error("Unsupported or invalid type: " + type);
    }
  }
  return ret;
};

ABI.toSerpent = function (types) {
  const ret = [];
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    if (type === "bytes") {
      ret.push("s");
    } else if (type.startsWith("bytes")) {
      ret.push("b" + parseTypeN(type));
    } else if (type === "int256") {
      ret.push("i");
    } else if (type === "int256[]") {
      ret.push("a");
    } else {
      throw new Error("Unsupported or invalid type: " + type);
    }
  }
  return ret.join("");
};

module.exports = ABI;