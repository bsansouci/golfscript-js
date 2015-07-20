function Node(type, data) {
  return {
    type: type,
    data: data
  };
}

function partial(f) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    return f.apply(null, args.concat(Array.prototype.slice.call(arguments, 0)));
  };
}

function pop(stack) {
  if(stack.length === 0) throw new Error("Pop in empty stack");
  return stack.pop();
}

function peek(stack) {
  if(stack.length === 0) throw new Error("Peeking in empty stack");
  return stack[stack.length - 1];
}

function push(stack, val) {
  return stack.push(val);
}

function skipPop(stack) {
  var tmp = pop(stack);
  var tmp2 = pop(stack);
  push(stack, tmp);
  return tmp2;
}

function _interpret(str, stack, symbolTable) {
  var state = "";
  var prev = "";
  var i = 0;
  var counter = 0;

  while(i < str.length) {
    i = checkPushIdentifier(str, i, stack, symbolTable);
    i = checkComment(str, i, stack, symbolTable);
    i = checkPushNumber(str, i, stack, symbolTable);
    i = checkPushBlock(str, i, stack, symbolTable);
    i = checkPushArray(str, i, stack, symbolTable);
    i = checkPushString(str, i, stack, symbolTable);
    i = doAssn(str, i, stack, symbolTable);
    i = doKeyword(str, i, whileFunc, "while", 2, stack, symbolTable);
    i = doKeyword(str, i, untilFunc, "until", 2, stack, symbolTable);
    i = doAction(str, i, stack, symbolTable);
  }
  if(prev.length > 0) {
    if(state === "number") {
      push(stack, Node("number", parseInt(prev)));
    } else if(state === "block") {
      push(stack, Node("block", prev));
    }
  }

  return stack;
}

function nextIdentifier(str, i){
  var end = str.substring(i);
  var res = end.match(/(^[A-Za-z_][A-Za-z0-9_]*)|(^ )/);
  if (res && res.length > 0){
    return res[0];
  } else {
    return "";
  }
}

function doAssn(str, i, stack, symbolTable){
  if (str[i] === ":"){
    i++;
    var ident = nextIdentifier(str, i);
    if (ident.length > 0){
      symbolTable[ident] = peek(stack);
      return  i + ident.length;
    } else {
      throw new Error("No identifier for assignment.");
    }
  }
  return i;
}

function checkPushIdentifier(str, i, stack, symbolTable){
  var ident = nextIdentifier(str, i);
  if (ident.length > 0 && ident in symbolTable){
    push(stack, symbolTable[ident]);
    return i + ident.length;
  }
  return i;
}

function checkComment(str, i, stack, symbolTable) {
  if(str[i] === "#") {
    var tmp = str.substring(i).indexOf("\n");
    return tmp === -1 ? str.length : tmp + i + 1;
  }

  return i;
}

function checkPushNumber(str, i, stack, symbolTable) {
  var j = i;
  while(!isNaN(parseInt(str[j]))) j++;
  if(j === i) return i;
  stack.push(Node("number", parseInt(str.substring(i, j))));
  return j;
}

function checkPushBlock(str, i, stack, symbolTable) {
  if(str[i] !== "{") return i;
  i++;
  var j = i;
  var counter = 1;
  while(true) {
    if(str[j] === "}" && --counter === 0) break;
    if(str[j] === "{") counter++;
    j++;
  }
  stack.push(Node("block", str.substring(i, j)));
  return j + 1;
}

function checkPushString(str, i, stack, symbolTable) {
  if(str[i] !== "\"") return i;
  i++;
  var j = i;
  var counter = 1;
  while(true) {
    if(str[j] === "\"") break;
    if(str[j] === "\\" && str[j+1] === "\"") j++;
    j++;
  }
  stack.push(Node("string", str.substring(i, j)));
  return j + 1;
}

function checkPushArray(str, i, stack, symbolTable){
    if(str[i] !== "[") return i;
  i++;
  var j = i;
  var counter = 1;
  while(true) {
    if(str[j] === "]" && --counter === 0) break;
    if(str[j] === "[") counter++;
    j++;
  }
  stack.push(Node("array", _interpret(str.substring(i, j), [], symbolTable)));
  return j + 1;
}

function doKeyword(str, i, func, keyword, min, stack, symbolTable) {
  if (lookahead(str, i, keyword)) {
    minArgs(func, stack, symbolTable, min);
    return i + keyword.length;
  }

  return i;
}

function doAction(str, i, stack, symbolTable) {
  if(i >= str.length) return i;

  switch(str[i]) {
    case "+":
      minArgs(add, stack, symbolTable, 2);
      break;
    case "-":
      minArgs(sub, stack, symbolTable, 2);
      break;
    case "*":
      minArgs(mult, stack, symbolTable, 2);
      break;
    case "/":
      minArgs(div, stack, symbolTable, 2);
      break;
    case ".":
      minArgs(dup, stack, symbolTable, 1);
      break;
    case "\\":
      minArgs(swap, stack, symbolTable, 2);
      break;
    case "@":
      minArgs(swap2, stack, symbolTable, 3);
      break;
    case ";":
      minArgs(pop, stack, symbolTable, 1);
      break;
    case ")":
      minArgs(inc, stack, symbolTable, 1);
      break;
    case "(":
      minArgs(dec, stack, symbolTable, 1);
      break;
    case "`":
      minArgs(quote, stack, symbolTable, 1);
      break;
    case "~":
      minArgs(tilde, stack, symbolTable, 1);
      break;
    case " ":
      if (!(" " in symbolTable)) break;
    case "!":
      minArgs(not, stack, symbolTable, 1);
      break;
    case "$":
      minArgs(dollarSign, stack, symbolTable, 1);
      break;
    default:
      return i;
  }

  return i + 1;
}

function lookahead(str, i, word) {
  var j = i;
  while(j < str.length && word[j-i] === str[j]) j++;

  return j === i + word.length;
}

function minArgs(f, stack, symbolTable, min) {
  if(stack.length < min) throw new Error("Stack size < " + min);
  return f(stack, symbolTable);
}

function add(stack, symbolTable) {
  push(stack, Node("number", pop(stack).data + pop(stack).data));
}

function sub(stack, symbolTable) {
  push(stack, Node("number", skipPop(stack).data - pop(stack).data));
}

function mult(stack, symbolTable) {
  push(stack, Node("number", pop(stack).data * pop(stack).data));
}

function div(stack, symbolTable) {
  push(stack, Node("number", skipPop(stack).data / pop(stack).data));
}

function dup(stack, symbolTable) {
  push(stack, JSON.parse(JSON.stringify(peek(stack))));
}

function swap(stack, symbolTable) {
  push(stack, skipPop(stack));
}

function swap2(stack, symbolTable) {
  push(stack, stack.splice(stack.length - 3, 1)[0]);
}

function inc(stack, symbolTable) {
  peek(stack).data++;
}

function dec(stack, symbolTable) {
  peek(stack).data--;
}

function not(stack, symbolTable) {
  var tmp = pop(stack);
  push(stack, Node("number", +(tmp.data === 0 || tmp.data.length === 0)));
}

function dollarSign(stack, symbolTable) {
  var p = pop(stack);
  if(p.type === "number") {
    if(stack.length < p.data) throw new Error("Stack height < " + p.data);
    push(stack, JSON.parse(JSON.stringify(stack[stack.length - p.data - 1])));
  } else if(p.type === "string") {
    p.data = p.data.split("").sort().join("");
    push(stack, p);
  } else if(p.type === "array") {
    p.data = p.data.sort(function(a, b) {
      return a.data - b.data;
    });
    push(stack, p);
  } else if(p.type === "block") {
    if(peek(stack).type !== "array") throw new Error("Expected an array on top of stack for sorting.");
    var arr = peek(stack);
    arr.data = arr.data.sort(function(a, b) {
      var aa = pop(_interpret(p.data, [a], symbolTable));
      var bb = pop(_interpret(p.data, [b], symbolTable));
      return aa.data === bb.data ? 0 : aa.data < bb.data ? -1 : 1;
    });
  }

}

function quote(stack, symbolTable){
  var data;
  switch(peek(stack).type){
    case "block":
      data = "{" + pop(stack).data + "}";
      break;
    case "string":
      data = "\"";
      var old = pop(stack).data;
      for (var i = 0; i < old.length; i++){
        if (old[i] === "\""){
          data += "\\\"";
        } else {
          data += old[i];
        }
      }
      data += "\"";
      break;
    case "number":
      data = pop(stack).data.toString();
      break;
  }
  push(stack, Node("string", data));
}

function tilde(stack, symbolTable){
  var popped = pop(stack);
  switch (popped.type){
    case "block":
    case "string":
      _interpret(popped.data, stack, symbolTable);
      break;
    case "number":
      push(stack, Node("number", -popped.data - 1));
      break;
    case "array":
      for (var i = 0; i < popped.data.length; i++){
        push(stack, popped.data[i]);
      }
      break;
  }
}

function whileFunc(stack, symbolTable) {
  var body = pop(stack);
  var cond = pop(stack);
  while(pop(_interpret(cond.data, stack, symbolTable)).data !== 0) {
    _interpret(body.data, stack, symbolTable);
  }
}

function untilFunc(stack, symbolTable) {
  var body = pop(stack);
  var cond = pop(stack);
  while(pop(_interpret(cond.data, stack, symbolTable)).data === 0) {
    _interpret(body.data, stack, symbolTable);
  }
}

function interpret(str) {
  var stack = _interpret(str, [], {});
  console.log(prettyPrint(stack));
}

function prettyPrint(stack){
  var s = "";
  for (var i = 0; i < stack.length; i++){
    switch (stack[i].type){
      case "number":
        s += stack[i].data.toString() + ",";
        break;
      case "block":
        s += "{" + stack[i].data + "},";
        break;
      case "string":
        s += "'" + stack[i].data + "',";
        break;
      case "array":
        s += "[" + prettyPrint(stack[i].data) + "],";
        break;
    }
  }
  return s.substring(0, s.length-1);
}

// interpret("\"bdca\"$");

// interpret("8.{1-.}{.@*\\}while;");
// interpret("1.0{.5-}{@@.@+@)}while;\\;");