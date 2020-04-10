phina.define("ItemInfo", {
  _static: {
      get: function(kind) {
          switch (kind) {
              case "shortsword":
              case ITEM_SHORTSWORD:
                  return {
                      name: "SHORT SWORD",
                      type: "sword",
                      isWeapon: true,
                      isSlash: true,
                      power: 10,
                      stunPower: 1,
                      maxIndex: 0,
                      collision: {
                          width: 14,
                          height: 30
                      }
                  };
              case "longsword":
              case ITEM_LONGSWORD:
                  return {
                      name: "LONG SWORD",
                      type: "sword",
                      isWeapon: true,
                      isSlash: true,
                      power: 15,
                      stunPower: 5,
                      maxIndex: 7,
                      collision: {
                          width: 24,
                          height: 25
                      }
                  };
              case "ax":
              case ITEM_AX:
                  return {
                      name: "AX",
                      type: "ax",
                      isWeapon: true,
                      isSlash: true,
                      isBrow: true,
                      power: 20,
                      stunPower: 20,
                      maxIndex: 4,
                      collision: {
                          width: 14,
                          height: 26
                      }
                  };
              case "spear":
              case ITEM_SPEAR:
                  return {
                      name: "SPEAR",
                      type: "spear",
                      isWeapon: true,
                      isSting: true,
                      power: 10,
                      stunPower: 1,
                      maxIndex: 4,
                      collision: {
                          width: 39,
                          height: 10
                      }
                  };
              case "bow":
              case ITEM_BOW:
                  return {
                      name: "BOW",
                      type: "bow",
                      isWeapon: true,
                      isBrow: true,
                      power: 5,
                      stunPower: 5,
                      maxIndex: 0,
                      collision: {
                          width: 20,
                          height: 10
                      }
                  };
              case "rod":
              case ITEM_ROD:
                  return {
                      name: "MAGIC ROD",
                      type: "rod",
                      isWeapon: true,
                      isBrow: true,
                      isFire: true,
                      power: 5,
                      stunPower: 10,
                      maxIndex: 7,
                      collision: {
                          width: 20,
                          height: 10
                      }
                  };
              case "book":
              case ITEM_BOOK:
                  return {
                      name: "BOOK",
                      type: "book",
                      isWeapon: true,
                      isBrow: true,
                      isHoly: true,
                      power: 10,
                      stunPower: 40,
                      maxIndex: 0,
                      collision: {
                          width: 20,
                          height: 20
                      }
                  };
              case "shield":
              case ITEM_SHIELD:
                  return {
                      name: "SHIELD",
                      type: "equip",
                      isEquip: true,
                      power: 20,
                      point: 1000,
                  };
              case "armor":
              case ITEM_ARMOR:
                  return {
                      name: "ARMOR",
                      type: "equip",
                      isEquip: true,
                      power: 30,
                      point: 5000,
                  };
              case "hat":
              case ITEM_HAT:
                  return {
                      name: "HAT",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 300,
                  };
              case "boots":
              case ITEM_BOOTS:
                  return {
                      name: "BOOTS",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 500,
                  };
              case "grove":
              case ITEM_GROVE:
                  return {
                      name: "GROVE",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 500,
                  };
              case "ring":
              case ITEM_RING:
                  return {
                      name: "RING",
                      type: "equip",
                      isEquip: true,
                      power: 20,
                      point: 3000,
                  };
              case "scroll":
              case ITEM_SCROLL:
                  return {
                      name: "SCROLL",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "letter":
              case ITEM_LETTER:
                  return {
                      name: "LETTER",
                      type: "item",
                      isItem: true,
                      point: 100,
                  };
              case "card":
              case ITEM_CARD:
                  return {
                      name: "CARD",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "key":
              case ITEM_KEY:
                  return {
                      name: "KEY",
                      type: "key",
                      isKey: true,
                      point: 2000,
                  };
              case "coin":
              case ITEM_COIN:
                  return {
                      name: "COIN",
                      type: "item",
                      isItem: true,
                      point: 500,
                  };
              case "bag":
              case ITEM_BAG:
                  return {
                      name: "BAG",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "orb":
              case ITEM_ORB:
                  return {
                      name: "ORB",
                      type: "item",
                      isItem: true,
                      point: 5000,
                  };
              case "stone":
              case ITEM_STONE:
                  return {
                      name: "STONE",
                      type: "item",
                      isItem: true,
                      point: 2000,
                  };
              case "jewel":
              case ITEM_JEWEL:
                  return {
                      name: "JEWEL",
                      type: "item",
                      isItem: true,
                      point: 5000,
                  };
              case "jewelbox":
              case ITEM_JEWELBOX:
                  return {
                      name: "JEWELBOX",
                      type: "item",
                      isItem: true,
                      point: 10000,
                  };
              case "apple":
              case ITEM_APPLE:
                  return {
                      name: "APPLE",
                      type: "food",
                      isFood: true,
                      power: 20,
                  };
              case "harb":
              case ITEM_HARB:
                  return {
                      name: "HARB",
                      type: "food",
                      isFood: true,
                      power: 40,
                  };
              case "meat":
              case ITEM_MEAT:
                  return {
                      name: "MEAT",
                      type: "food",
                      isFood: true,
                      power: 60,
                  };
              case "potion":
              case ITEM_POTION:
                  return {
                      name: "POTION",
                      type: "food",
                      isFood: true,
                      power: 100,
                  };
              default:
                  return {};
          }
      },
  },
});

