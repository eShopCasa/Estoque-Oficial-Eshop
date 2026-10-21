// Catálogo de produtos: código de barras -> SKU / nome / descrição.
// Para cadastrar um produto novo, basta incluir uma linha aqui.
const productsDB = {
    // Comfort Class - Solteiro
    "7901198901274": { sku: "CSCCPU", name: "Comfort Class Solteiro", desc: "Suede Preto" },
    "7901198901298": { sku: "CSCCCU", name: "Comfort Class Solteiro", desc: "Suede Cinza" },
    "7901198901311": { sku: "CSCCBCU", name: "Comfort Class Solteiro", desc: "Suede Branco" },
    "7901198901335": { sku: "CSCCBGU", name: "Comfort Class Solteiro", desc: "Suede Bege" },
    "7901198901359": { sku: "CSCCMU", name: "Comfort Class Solteiro", desc: "Suede Marrom" },
    "7901198901380": { sku: "CSCCAU", name: "Comfort Class Solteiro", desc: "Suede Azul" },
    "7901198901403": { sku: "CSCCVU", name: "Comfort Class Solteiro", desc: "Suede Vinho" },

    // Comfort Class - Viuva
    "7901198901458": { sku: "CVCCPU", name: "Comfort Class Viuva", desc: "Suede Preto" },
    "7901198901472": { sku: "CVCCCU", name: "Comfort Class Viuva", desc: "Suede Cinza" },
    "7901198901496": { sku: "CVCCBCU", name: "Comfort Class Viuva", desc: "Suede Branco" },
    "7901198901519": { sku: "CVCCBGU", name: "Comfort Class Viuva", desc: "Suede Bege" },
    "7901198901564": { sku: "CVCCMU", name: "Comfort Class Viuva", desc: "Suede Marrom" },
    "7901198901571": { sku: "CVCCAU", name: "Comfort Class Viuva", desc: "Suede Azul" },
    "7901198901601": { sku: "CVCCVU", name: "Comfort Class Viuva", desc: "Suede Vinho" },

    // Comfort Class - Casal
    "7901198901649": { sku: "CCCCPU", name: "Comfort Class Casal", desc: "Suede Preto" },
    "7901198901663": { sku: "CCCCCU", name: "Comfort Class Casal", desc: "Suede Cinza" },
    "7901198901687": { sku: "CCCCBCU", name: "Comfort Class Casal", desc: "Suede Branco" },
    "7901198901717": { sku: "CCCCBGU", name: "Comfort Class Casal", desc: "Suede Bege" },
    "7901198901724": { sku: "CCCCMU", name: "Comfort Class Casal", desc: "Suede Marrom" },
    "7901198901755": { sku: "CCCCAU", name: "Comfort Class Casal", desc: "Suede Azul" },
    "7901198901779": { sku: "CCCCVU", name: "Comfort Class Casal", desc: "Suede Vinho" },

    // Comfort Class - Queen
    "7901198901816": { sku: "CQCCPU", name: "Comfort Class Queen", desc: "Suede Preto" },
    "7901198901823": { sku: "CQCCCU", name: "Comfort Class Queen", desc: "Suede Cinza" },
    "7901198901830": { sku: "CQCCBCU", name: "Comfort Class Queen", desc: "Suede Branco" },
    "7901198901854": { sku: "CQCCBGU", name: "Comfort Class Queen", desc: "Suede Bege" },
    "7901198901885": { sku: "CQCCMU", name: "Comfort Class Queen", desc: "Suede Marrom" },
    "7901198901939": { sku: "CQCCAU", name: "Comfort Class Queen", desc: "Suede Azul" },
    "7901198901946": { sku: "CQCCVU", name: "Comfort Class Queen", desc: "Suede Vinho" },

    // Paris - Solteiro
    "7898723389976": { sku: "CSPPU", name: "Paris Solteiro", desc: "Paris Preto" },
    "7901198902929": { sku: "CSPCU", name: "Paris Solteiro", desc: "Paris Cinza" },
    "7901198902936": { sku: "CSPBRU", name: "Paris Solteiro", desc: "Paris Branco" },
    "7898723383264": { sku: "CSPBU", name: "Paris Solteiro", desc: "Paris Bege" },
    "7901198902950": { sku: "CSPMU", name: "Paris Solteiro", desc: "Paris Marrom" },

    // Paris - Viuva
    "7901198902967": { sku: "CVPPU", name: "Paris Viuva", desc: "Paris Preto" },
    "7901198902974": { sku: "CVPCU", name: "Paris Viuva", desc: "Paris Cinza" },
    "7901198902981": { sku: "CVPBRU", name: "Paris Viuva", desc: "Paris Branco" },
    "7901198902424": { sku: "CVPSB", name: "Paris Viuva", desc: "Paris Bege" },
    "7901198902998": { sku: "CVPMU", name: "Paris Viuva", desc: "Paris Marrom" },

    // Paris - Casal
    "7901198903001": { sku: "CCPPU", name: "Paris Casal", desc: "Paris Preto" },
    "7901198903018": { sku: "CCPCU", name: "Paris Casal", desc: "Paris Cinza" },
    "7901198903025": { sku: "CCPBRU", name: "Paris Casal", desc: "Paris Branco" },
    "7898723389983": { sku: "CCPBU", name: "Paris Casal", desc: "Paris Bege" },
    "7901198903032": { sku: "CCPMU", name: "Paris Casal", desc: "Paris Marrom" },

    // Paris - Queen
    "7901198903049": { sku: "CQPPU", name: "Paris Queen", desc: "Paris Preto" },
    "7901198903056": { sku: "CQPCU", name: "Paris Queen", desc: "Paris Cinza" },
    "7901198903063": { sku: "CQPBRU", name: "Paris Queen", desc: "Paris Branco" },
    "7901198902493": { sku: "CQPSB", name: "Paris Queen", desc: "Paris Bege" },
    "7901198903070": { sku: "CQPMU", name: "Paris Queen", desc: "Paris Marrom" },

    // Life D33 (já existentes)
    "7898723389815": { sku: "CSL33SPU", name: "Life D33 Solteiro", desc: "Suede Preto" },
    "7898723389822": { sku: "CSL33SCU", name: "Life D33 Solteiro", desc: "Suede Cinza" },
    "7898723389839": { sku: "CSL33BCU", name: "Life D33 Solteiro", desc: "Suede Branco" },
    "7898723389846": { sku: "CSL33BGU", name: "Life D33 Solteiro", desc: "Suede Bege" },
    "7898723389853": { sku: "CVL33SPU", name: "Life D33 Viuva", desc: "Suede Preto" },
    "7898723389860": { sku: "CVL33SCU", name: "Life D33 Viuva", desc: "Suede Cinza" },
    "7898723389877": { sku: "CVL33BCU", name: "Life D33 Viuva", desc: "Suede Branco" },
    "7898723389884": { sku: "CVL33BGU", name: "Life D33 Viuva", desc: "Suede Bege" },
    "7898723389891": { sku: "CCL33SPU", name: "Life D33 Casal", desc: "Suede Preto" },
    "7898723389907": { sku: "CCL33SCU", name: "Life D33 Casal", desc: "Suede Cinza" },
    "7898723389914": { sku: "CCL33BCU", name: "Life D33 Casal", desc: "Suede Branco" },
    "7898723389921": { sku: "CCL33BGU", name: "Life D33 Casal", desc: "Suede Bege" },
    "7898723389938": { sku: "CQL33SPU", name: "Life D33 Queen", desc: "Suede Preto" },
    "7898723389945": { sku: "CQL33SCU", name: "Life D33 Queen", desc: "Suede Cinza" },
    "7898723389952": { sku: "CQL33BCU", name: "Life D33 Queen", desc: "Suede Branco" },
    "7898723389969": { sku: "CQL33BGU", name: "Life D33 Queen", desc: "Suede Bege" },

    // Colchão D33 - Solteiro
    "7898723380331": { sku: "CSP33", name: "D33 Solteiro", desc: "Suede Preto" },
    "7898723382397": { sku: "CSP33SC", name: "D33 Solteiro", desc: "Suede Cinza" },
    "7898723382816": { sku: "CSP33SBR", name: "D33 Solteiro", desc: "Suede Branco" },
    "7898723382373": { sku: "CSP33SB", name: "D33 Solteiro", desc: "Suede Bege" },
    "7898723382380": { sku: "CSP33SM", name: "D33 Solteiro", desc: "Suede Marrom" },

    // Colchão D33 - Viuva
    "7898723380348": { sku: "CVP33", name: "D33 Viuva", desc: "Suede Preto" },
    "7898723382427": { sku: "CVP33SC", name: "D33 Viuva", desc: "Suede Cinza" },
    "7901198903131": { sku: "CVP33SBR", name: "D33 Viuva", desc: "Suede Branco" },
    "7898723382403": { sku: "CVP33SB", name: "D33 Viuva", desc: "Suede Bege" },
    "7898723382410": { sku: "CVP33SM", name: "D33 Viuva", desc: "Suede Marrom" },

    // Colchão D33 - Casal
    "7898723380355": { sku: "CCP33", name: "D33 Casal", desc: "Suede Preto" },
    "7898723382458": { sku: "CCP33SC", name: "D33 Casal", desc: "Suede Cinza" },
    "7901198903117": { sku: "CCP33SBR", name: "D33 Casal", desc: "Suede Branco" },
    "7898723382434": { sku: "CCP33SB", name: "D33 Casal", desc: "Suede Bege" },
    "7898723382441": { sku: "CCP33SM", name: "D33 Casal", desc: "Suede Marrom" },

    // Colchão D33 - Queen
    "7898723380362": { sku: "CQP33", name: " D33 Queen", desc: "Suede Preto" },
    "7898723382489": { sku: "CQP33SC", name: " D33 Queen", desc: "Suede Cinza" },
    "7901198903094": { sku: "CQP33SBR", name: " D33 Queen", desc: "Suede Branco" },
    "7898723382465": { sku: "CQP33SB", name: " D33 Queen", desc: "Suede Bege" },
    "7898723382472": { sku: "CQP33SM", name: " D33 Queen", desc: "Suede Marrom" },

    // D20
    "7898723380126": { sku: "CSP20", name: " D20 Solteiro", desc: "Suede Preto" },
    "7898723380140": { sku: "CCP20", name: " D20 Casal", desc: "Suede Preto" },
    "7898723380133": { sku: "CVP20", name: " D20 Viuva", desc: "Suede Preto" },

    // Prime D45 - Solteiro
    "7898723386852": { sku: "CSP45", name: " Prime D45 Solteiro", desc: "Suede Preto" },
    "7898723386838": { sku: "CSC45", name: " Prime D45 Solteiro", desc: "Suede Cinza" },
    "7898723386821": { sku: "CSBR45", name: " Prime D45 Solteiro", desc: "Suede Branco" },
    "7898723386814": { sku: "CSB45", name: " Prime D45 Solteiro", desc: "Suede Bege" },
    "7898723386845": { sku: "CSM45", name: " Prime D45 Solteiro", desc: "Suede Marrom" },

    // Prime D45 - Viuva
    "7898723386807": { sku: "CVSP45", name: " Prime D45 Viuva", desc: "Suede Preto" },
    "7898723386784": { sku: "CVSC45", name: " Prime D45 Viuva", desc: "Suede Cinza" },
    "7898723386777": { sku: "CVSBR45", name: " Prime D45 Viuva", desc: "Suede Branco" },
    "7898723386760": { sku: "CVSB45", name: " Prime D45 Viuva", desc: "Suede Bege" },
    "7898723386791": { sku: "CVSM45", name: " Prime D45 Viuva", desc: "Suede Marrom" },

    // Prime D45 - Casal
    "7898723386753": { sku: "CCP45", name: " Prime D45 Casal", desc: "Suede Preto" },
    "7898723386739": { sku: "CCC45", name: " Prime D45 Casal", desc: "Suede Cinza" },
    "7898723386722": { sku: "CCBR45", name: " Prime D45 Casal", desc: "Suede Branco" },
    "7898723386715": { sku: "CCB45", name: " Prime D45 Casal", desc: "Suede Bege" },
    "7898723386746": { sku: "CCM45", name: " Prime D45 Casal", desc: "Suede Marrom" },

    // Prime D45 - Queen
    "7898723386906": { sku: "CQP45", name: " Prime D45 Queen", desc: "Suede Preto" },
    "7898723386883": { sku: "CQC45", name: " Prime D45 Queen", desc: "Suede Cinza" },
    "7898723386876": { sku: "CQBR45", name: " Prime D45 Queen", desc: "Suede Branco" },
    "7898723386869": { sku: "CQB45", name: " Prime D45 Queen", desc: "Suede Bege" },
    "7898723386890": { sku: "CQM45", name: " Prime D45 Queen", desc: "Suede Marrom" },
};
