class Human {
  constructor(name) {
    this.name = name;
  }
  beBitten(dog) {
    console.log(this.name + '被' + dog.name + '咬了')
  } 
}

class Dog {
  constructor(name) {
    this.name = name;
  }
  bitten(human) {
    human.beBitten(this);
  }
}


const zhangsan = new Human('zhangsan');

const dahuang = new Dog('dahuang');

dahuang.bitten(zhangsan);