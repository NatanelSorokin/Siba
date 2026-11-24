import { Flame, Heart, ShoppingBag, Star } from 'lucide-react';

export default function BestSellers() {
  const products = [
    {
      id: 1,
      name: "מארז 50 בלוני פסטל פרימיום 12 אינץ'",
      desc: "עמידים במיוחד לניפוח באוויר או בהליום",
      price: "29.90",
      oldPrice: "42.00",
      rating: "4.9",
      reviews: "128",
      tag: "30% הנחה",
      tagColor: "bg-brand-600",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXDTQ4Wm6IF6OJpwkWLqaFWIgcvJ6j_qVrwjyHNQ3sh5qn5laQDrqe4EBBYAlqtwRopE7YDtxHT1HyWbCY0_5TvTvFDdY6hI6xgI8K1S4T_CQRlEKeifRqRCTDzQXZFS_ffbxWsfee_fSClNYktNq-jyb4uYtUWxN6gwvrdLJ-8hOrXBmn4COL4C81kBwp7e3Hek_QlkH9QElDHuucIpQlFeOJK5ZvduzlImXWIAeofi-A4sAOcTKnMA"
    },
    {
      id: 2,
      name: "קשת בלונים מעוצבת להרכבה עצמית DIY - ורוד ורוז גולד",
      desc: "כולל 70 בלונים וסרט שזירה מקצועי",
      price: "69.90",
      oldPrice: "89.00",
      rating: "5.0",
      reviews: "94",
      tag: "רב-מכר",
      tagColor: "bg-ink-900",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnVhyGH-WchAZlN08NNP7qPXPv1ScKTMLpYkQxxImAy98-OuNQi9PxSx56_umqwqvNFgl0714hdi00FOvP-_IoILXZLLGtNDUskXvkRYPxgH7n-t6JzO8L5df_gI98Giv1frxy5O6rmDZdyB1vfP-p4MNY-tJzok7izBCwX2Yfkv4a5kAzLG_MW_xO_G_QbfqKoQNuQ_BhxqK-uWCOYRetAePp3iwjrUfnAEkc8iiSdDyHZIUzheH1Lw"
    },
    {
      id: 3,
      name: "סט צלחות וכוסות יוקרתיות דגם שיש וזהב (16 סועדים)",
      desc: "קרטון קשיח פרימיום בטוח למזון חם",
      price: "49.90",
      oldPrice: "65.00",
      rating: "4.8",
      reviews: "62",
      tag: "מארז חיסכון",
      tagColor: "bg-amber-600",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeCfTcPVZgz8EMq1otkKljXqZhBwWKtXHZgrf8W5QkC5-YLS_IGHRCHkXZIjSX3uwmdVvm55C2U2Op8esA-RWH5KvKvQV_cNu9SjOfMHTwjxbGbR3zQVbV7MLp9_N2pdfU9mS5a5PJJNSdJfQxIS_Jqsl7K-T43I2i-yZ5yd2PSd1869cvu1-dWrxJi2hK9XgXXQ0GABvpYjRQydTmDLmChosY4tjJPCToSMIVjn4GNTNc4BDRYhEkiw"
    },
    {
      id: 4,
      name: "מעמד עוגה וקאפקייקס 3 קומות מקרטון קשיח מעוצב",
      desc: "קל להרכבה מהירה, יציב ורב-פעמי",
      price: "24.90",
      oldPrice: "35.00",
      rating: "4.7",
      reviews: "41",
      tag: "",
      tagColor: "",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuCyO0X_53_MjzdQKQ7wQpFT_innOvvYNFf6ge_-n8CgiaihXwi7VJZid1ULkguSXjYGceMlMFg2gqvg0lJ73kXuaZQhXnZ8Z4ubu-CONx_TyVp4HdzimJNTDyMtWVj8oZhLWsWbAenrArcyhMWON0pb6u3IQt__V-W71i8xlbajkYJMiDWoNK9NQup7XGCP4bNzkA85SGyhx25A8VGLGGzPC-BaIa3lAbKXdKuznWFXzb08pXtaixenCA"
    },
    {
      id: 5,
      name: 'בלוני מספרים ענקיים 86 ס"מ (זהב / כסף / רוז גולד)',
      desc: "כולל שסתום אל-חזור לניפוח קל",
      price: "19.90",
      oldPrice: "29.00",
      rating: "4.9",
      reviews: "210",
      tag: "מבצע 1+1",
      tagColor: "bg-brand-600",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuDcaQAzRMJYEcEkSTXIFZf2tHy6fA6zqntH2CGO8cb_lvyiV9riaEWLVDf6u7rQ6RyP-WdBxHv8P92YGDjA-R13sgLBa_XExDpo3Jo2mOGsmnKMZhCH_p0PmsfZ74dVbN9kU8ZMdgXJV1BDZhVR7RvXFT4KT98xk6tS3dxIFXYJRXaahhESYtvrZzhkpqKuEDWfQLL643Ms6e_IyJlLRl33BsEH4XaB6n-IFFJRYhDMNnY3j34TQALp0Q"
    },
    {
      id: 6,
      name: "ערכת אביזרי צילום פוטו-בות למסיבה (24 יחידות)",
      desc: "מקלות עץ מודבקים וקשיחים לתמונות בלתי נשכחות",
      price: "18.90",
      oldPrice: "25.00",
      rating: "4.6",
      reviews: "53",
      tag: "",
      tagColor: "",
      imgSrc: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_rQDDYlgPki6qnum73vcp2jYbdfWQFMfAuNJoN6Rjs7CSOz-TVniwNAH-crt03T7PtNMS2vapwHrkDgsLKVl0Nj683MKU4_9HfTk_MXbvUFhrJUTGmWLXqjVT8sjXLnpgk-gp8LeZYzeKKsLmkLVnn5JTe4g7k92lTznmpQa29NGC4fTCr8GgVN74z2T6OjNQosHaEpATIhjO2Rd1cfG8bVN4yZo3oTQefB7lYNo1KfiVG61fAuLAaw"
    }
  ];

  return (
    <section className="max-w-7xl mx-auto w-full px-4 py-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold mb-2">
            <Flame className="w-4 h-4" /> 
            מבצעי השבוע החמים
          </div>
          <h2 className="text-3xl font-bold text-ink-900">המוצרים הנמכרים ביותר</h2>
        </div>
        <div className="text-ink-500 text-xs font-medium">מחירים כוללים מע"מ כחוק</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {products.map((product) => (
          <div key={product.id} className="rounded-2xl bg-white p-3 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group border border-ink-100">
            <div>
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-100 mb-3">
                <img src={product.imgSrc} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                
                {product.tag && (
                  <span className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm ${product.tagColor}`}>
                    {product.tag}
                  </span>
                )}
                
                <button className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-ink-500 flex items-center justify-center transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-1 text-amber-500 text-xs mb-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-bold text-ink-700">{product.rating}</span>
                <span className="text-ink-400 font-normal">({product.reviews} ביקורות)</span>
              </div>
              
              <h3 className="text-sm text-ink-900 font-semibold line-clamp-2 leading-snug">
                {product.name}
              </h3>
              <p className="text-xs text-ink-500 mt-1 line-clamp-1">{product.desc}</p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-ink-100">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-lg font-bold text-brand-600">₪{product.price}</span>
                <span className="text-xs text-ink-500 line-through">₪{product.oldPrice}</span>
              </div>
              <button className="w-full h-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
                <ShoppingBag className="w-4 h-4" />
                <span>הוסף לסל</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
